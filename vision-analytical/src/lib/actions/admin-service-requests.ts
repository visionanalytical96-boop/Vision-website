'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/dal';
import { setServiceRequestStatus } from '@/lib/service-request-status';
import { updateServiceRequestStatusSchema, assignEngineerSchema } from '@/lib/validation/admin-service-requests';
import { generateReferenceNumber } from '@/lib/reference-number';
import { ACTIVE_STATUSES } from '@/lib/service-visit';
import { Role, ServiceRequestStatus, VisitStatus } from '@/generated/prisma/client';

function revalidateServiceRequestPaths(requestId: string) {
  revalidatePath(`/admin/service-requests/${requestId}`);
  revalidatePath('/admin/service-requests');
  revalidatePath(`/portal/service-requests/${requestId}`);
  revalidatePath('/engineer');
  revalidatePath('/engineer/history');
}

export async function updateServiceRequestStatus(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);

  const validated = updateServiceRequestStatusSchema.safeParse({
    requestId: formData.get('requestId'),
    status: formData.get('status'),
  });
  if (!validated.success) return;

  const { requestId, status } = validated.data;
  const updated = await setServiceRequestStatus(requestId, status);
  if (!updated) return;

  revalidateServiceRequestPaths(requestId);
}

export async function assignEngineer(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);

  const validated = assignEngineerSchema.safeParse({
    requestId: formData.get('requestId'),
    engineerId: formData.get('engineerId'),
  });
  if (!validated.success) return;

  const { requestId, engineerId } = validated.data;

  const request = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    select: { status: true, customerInstrumentId: true },
  });
  if (!request) return;

  if (engineerId) {
    await prisma.$transaction(async (tx) => {
      await tx.serviceRequest.update({
        where: { id: requestId },
        data: {
          assignedEngineerId: engineerId,
          status: request.status === ServiceRequestStatus.OPEN ? ServiceRequestStatus.ASSIGNED : request.status,
        },
      });

      // Assigning is what creates the trip to site. Without a visit the job
      // never reaches the engineer's phone, so the two have to happen
      // together. A job already open with this engineer is left alone rather
      // than duplicated.
      const openVisit = await tx.serviceVisit.findFirst({
        where: { serviceRequestId: requestId, engineerId, status: { in: ACTIVE_STATUSES } },
        select: { id: true },
      });

      if (!openVisit) {
        await tx.serviceVisit.create({
          data: {
            visitNumber: generateReferenceNumber('VST'),
            serviceRequestId: requestId,
            engineerId,
            customerInstrumentId: request.customerInstrumentId,
            events: {
              create: { status: VisitStatus.ASSIGNED, actorLabel: 'Admin', note: 'Assigned to engineer.' },
            },
          },
        });
      }
    });
  } else {
    await prisma.serviceRequest.update({
      where: { id: requestId },
      data: {
        assignedEngineerId: null,
        status: request.status === ServiceRequestStatus.ASSIGNED ? ServiceRequestStatus.OPEN : request.status,
      },
    });
  }

  revalidateServiceRequestPaths(requestId);
}
