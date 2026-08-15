'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireRole, getCurrentUser } from '@/lib/dal';
import { setServiceRequestStatusIn } from '@/lib/service-request-status';
import { canTransition, requestStatusForVisits, timestampField, visitStatusMeta } from '@/lib/service-visit';
import { visitTransitionSchema, visitTravelSchema } from '@/lib/validation/engineer-visits';
import { Role, VisitStatus } from '@/generated/prisma/client';
import type { Prisma } from '@/generated/prisma/client';

export interface VisitActionState {
  error?: string;
  success?: string;
}

// The timeline keeps a plain-text label as well as the id, so history stays
// readable after an engineer leaves and their account is deactivated.
async function actorLabel(fallbackId: string): Promise<string> {
  const user = await getCurrentUser();
  return user ? `${user.name} (${user.email})` : fallbackId;
}

function revalidateVisitPaths(visitId: string, serviceRequestId: string) {
  revalidatePath(`/engineer/jobs/${visitId}`);
  revalidatePath('/engineer');
  revalidatePath('/engineer/history');
  revalidatePath(`/admin/service-requests/${serviceRequestId}`);
  revalidatePath('/admin/service-requests');
  revalidatePath(`/portal/service-requests/${serviceRequestId}`);
}

/**
 * Move a visit to its next state.
 *
 * Everything happens in one transaction: the visit status, the timestamp it
 * stamps, the timeline event and the ticket status the change implies. Half of
 * that landing would leave a job whose history disagrees with its status, and
 * the history is the part people trust when there is a dispute.
 */
export async function transitionVisit(
  _prevState: VisitActionState | undefined,
  formData: FormData,
): Promise<VisitActionState> {
  const session = await requireRole(Role.ENGINEER);

  const parsed = visitTransitionSchema.safeParse({
    visitId: formData.get('visitId'),
    status: formData.get('status'),
    note: formData.get('note') ?? undefined,
    latitude: formData.get('latitude') || undefined,
    longitude: formData.get('longitude') || undefined,
    accuracyM: formData.get('accuracyM') || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' };
  }

  const { visitId, status, note, latitude, longitude, accuracyM } = parsed.data;

  const visit = await prisma.serviceVisit.findFirst({
    where: { id: visitId, engineerId: session.userId },
    select: {
      id: true,
      status: true,
      serviceRequestId: true,
      serviceRequest: { select: { status: true, amcContractId: true } },
    },
  });
  if (!visit) return { error: 'Job not found.' };

  const check = canTransition(visit.status, status, { note: note ?? undefined });
  if (!check.ok) return { error: check.error };

  const who = await actorLabel(session.userId);
  const now = new Date();
  const stampedField = timestampField(status);

  const data: Prisma.ServiceVisitUpdateInput = { status };
  if (stampedField) Object.assign(data, { [stampedField]: now });
  if (note?.trim()) data.statusNote = note.trim();

  // Check-in and check-out are the two claims about being somewhere, so those
  // are the two that keep a copy of the fix on the visit itself. Every
  // transition's fix is kept on its event either way.
  if (status === VisitStatus.REACHED_SITE) {
    Object.assign(data, { checkInLatitude: latitude ?? null, checkInLongitude: longitude ?? null, checkInAccuracyM: accuracyM ?? null });
  }
  if (status === VisitStatus.WORK_COMPLETED) {
    Object.assign(data, {
      checkOutAt: now,
      checkOutLatitude: latitude ?? null,
      checkOutLongitude: longitude ?? null,
      checkOutAccuracyM: accuracyM ?? null,
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.serviceVisit.update({ where: { id: visitId }, data });

    await tx.visitEvent.create({
      data: {
        visitId,
        status,
        note: note?.trim() || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        accuracyM: accuracyM ?? null,
        actorId: session.userId,
        actorLabel: who,
      },
    });

    // A declined job must not stay assigned to the person who declined it,
    // or it sits in nobody's queue looking handled.
    if (status === VisitStatus.REJECTED) {
      await tx.serviceRequest.update({
        where: { id: visit.serviceRequestId },
        data: { assignedEngineerId: null },
      });
    }

    const siblings = await tx.serviceVisit.findMany({
      where: { serviceRequestId: visit.serviceRequestId },
      select: { status: true },
    });

    const nextRequestStatus = requestStatusForVisits(
      siblings.map((sibling) => sibling.status),
      visit.serviceRequest.status,
    );
    if (nextRequestStatus) {
      await setServiceRequestStatusIn(tx, visit.serviceRequestId, nextRequestStatus, visit.serviceRequest);
    }
  });

  revalidateVisitPaths(visitId, visit.serviceRequestId);
  return { success: `Job marked ${visitStatusMeta[status].label.toLowerCase()}.` };
}

/** Odometer reading for the trip, recorded separately from the status flow. */
export async function recordTravelDistance(
  _prevState: VisitActionState | undefined,
  formData: FormData,
): Promise<VisitActionState> {
  const session = await requireRole(Role.ENGINEER);

  const parsed = visitTravelSchema.safeParse({
    visitId: formData.get('visitId'),
    travelDistanceKm: formData.get('travelDistanceKm'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Enter the distance travelled.' };
  }

  const { visitId, travelDistanceKm } = parsed.data;

  const visit = await prisma.serviceVisit.findFirst({
    where: { id: visitId, engineerId: session.userId },
    select: { serviceRequestId: true },
  });
  if (!visit) return { error: 'Job not found.' };

  await prisma.serviceVisit.update({ where: { id: visitId }, data: { travelDistanceKm } });

  revalidateVisitPaths(visitId, visit.serviceRequestId);
  return { success: 'Travel distance saved.' };
}
