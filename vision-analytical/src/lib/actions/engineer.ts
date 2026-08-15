'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/dal';
import { submitServiceReportSchema } from '@/lib/validation/engineer';
import { Role } from '@/generated/prisma/client';

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

  revalidatePath('/engineer');
  revalidatePath(`/portal/service-requests/${jobId}`);
  return { success: true };
}
