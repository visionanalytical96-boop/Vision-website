'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/dal';
import { updateJobStatusSchema, submitServiceReportSchema } from '@/lib/validation/engineer';
import { Role, ServiceRequestStatus } from '@/generated/prisma/client';

export async function updateJobStatus(formData: FormData): Promise<void> {
  const session = await requireRole(Role.ENGINEER);

  const validated = updateJobStatusSchema.safeParse({
    jobId: formData.get('jobId'),
    status: formData.get('status'),
  });
  if (!validated.success) return;

  const { jobId, status } = validated.data;

  const job = await prisma.serviceRequest.findFirst({ where: { id: jobId, assignedEngineerId: session.userId } });
  if (!job) return;

  await prisma.serviceRequest.update({
    where: { id: jobId },
    data: { status, resolvedAt: status === ServiceRequestStatus.COMPLETED ? new Date() : null },
  });

  revalidatePath(`/engineer/jobs/${jobId}`);
  revalidatePath('/engineer');
  revalidatePath('/engineer/history');
  revalidatePath(`/portal/service-requests/${jobId}`);
}

export interface ServiceReportFormState {
  errors?: Record<string, string[] | undefined>;
  formError?: string;
  success?: boolean;
}

export async function submitServiceReport(
  _prevState: ServiceReportFormState | undefined,
  formData: FormData,
): Promise<ServiceReportFormState> {
  const session = await requireRole(Role.ENGINEER);

  const validated = submitServiceReportSchema.safeParse({
    jobId: formData.get('jobId'),
    workPerformed: formData.get('workPerformed'),
    partsUsed: String(formData.get('partsUsed') ?? ''),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { jobId, workPerformed, partsUsed } = validated.data;

  const job = await prisma.serviceRequest.findFirst({ where: { id: jobId, assignedEngineerId: session.userId } });
  if (!job) {
    return { formError: 'Service request not found.' };
  }

  const partsUsedList = partsUsed
    ? partsUsed.split(',').map((part) => part.trim()).filter(Boolean)
    : [];

  await prisma.serviceReport.create({
    data: {
      serviceRequestId: jobId,
      engineerId: session.userId,
      workPerformed,
      partsUsed: partsUsedList,
      photos: [],
    },
  });

  revalidatePath(`/engineer/jobs/${jobId}`);
  revalidatePath(`/portal/service-requests/${jobId}`);
  return { success: true };
}
