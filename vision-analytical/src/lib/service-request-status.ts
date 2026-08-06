import 'server-only';
import { prisma } from '@/lib/db';
import { ServiceRequestStatus } from '@/generated/prisma/client';

// Shared by the engineer and admin status-update actions so AMC/CMC visit
// counting stays consistent no matter which role moves the request into (or
// out of) COMPLETED - a request counts as "one visit" the moment it's first
// marked complete, and gives the visit back if that's reverted.
export async function setServiceRequestStatus(requestId: string, nextStatus: ServiceRequestStatus): Promise<boolean> {
  const current = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    select: { status: true, amcContractId: true },
  });
  if (!current) return false;

  const enteringCompleted = nextStatus === ServiceRequestStatus.COMPLETED && current.status !== ServiceRequestStatus.COMPLETED;
  const leavingCompleted = current.status === ServiceRequestStatus.COMPLETED && nextStatus !== ServiceRequestStatus.COMPLETED;

  await prisma.$transaction(async (tx) => {
    await tx.serviceRequest.update({
      where: { id: requestId },
      data: { status: nextStatus, resolvedAt: nextStatus === ServiceRequestStatus.COMPLETED ? new Date() : null },
    });

    if (current.amcContractId && (enteringCompleted || leavingCompleted)) {
      await tx.amcContract.update({
        where: { id: current.amcContractId },
        data: { visitsUsed: { [enteringCompleted ? 'increment' : 'decrement']: 1 } },
      });
    }
  });

  return true;
}
