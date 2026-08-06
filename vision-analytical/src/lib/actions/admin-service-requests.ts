'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/dal';
import { setServiceRequestStatus } from '@/lib/service-request-status';
import { updateServiceRequestStatusSchema, assignEngineerSchema } from '@/lib/validation/admin-service-requests';
import { Role, ServiceRequestStatus } from '@/generated/prisma/client';

function revalidateServiceRequestPaths(requestId: string) {
  revalidatePath(`/admin/service-requests/${requestId}`);
  revalidatePath('/admin/service-requests');
  revalidatePath(`/portal/service-requests/${requestId}`);
  revalidatePath('/engineer');
  revalidatePath('/engineer/history');
  revalidatePath(`/engineer/jobs/${requestId}`);
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

  const request = await prisma.serviceRequest.findUnique({ where: { id: requestId }, select: { status: true } });
  if (!request) return;

  if (engineerId) {
    await prisma.serviceRequest.update({
      where: { id: requestId },
      data: {
        assignedEngineerId: engineerId,
        status: request.status === ServiceRequestStatus.OPEN ? ServiceRequestStatus.ASSIGNED : request.status,
      },
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
