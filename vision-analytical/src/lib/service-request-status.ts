import 'server-only';
import { prisma } from '@/lib/db';
import { ServiceRequestStatus } from '@/generated/prisma/client';
import type { Prisma } from '@/generated/prisma/client';

/** Either the client or a transaction handle, so callers can be atomic. */
export type ServiceRequestDb = typeof prisma | Prisma.TransactionClient;

// Shared by the engineer, visit and admin status-update paths so AMC/CMC visit
// counting stays consistent no matter which one moves the request into (or out
// of) COMPLETED - a request counts as "one visit" the moment it's first marked
// complete, and gives the visit back if that's reverted.
async function applyStatus(
  db: ServiceRequestDb,
  requestId: string,
  nextStatus: ServiceRequestStatus,
  current: { status: ServiceRequestStatus; amcContractId: string | null },
): Promise<void> {
  const enteringCompleted = nextStatus === ServiceRequestStatus.COMPLETED && current.status !== ServiceRequestStatus.COMPLETED;
  const leavingCompleted = current.status === ServiceRequestStatus.COMPLETED && nextStatus !== ServiceRequestStatus.COMPLETED;

  await db.serviceRequest.update({
    where: { id: requestId },
    data: { status: nextStatus, resolvedAt: nextStatus === ServiceRequestStatus.COMPLETED ? new Date() : null },
  });

  if (current.amcContractId && (enteringCompleted || leavingCompleted)) {
    await db.amcContract.update({
      where: { id: current.amcContractId },
      data: { visitsUsed: { [enteringCompleted ? 'increment' : 'decrement']: 1 } },
    });
  }
}

export async function setServiceRequestStatus(requestId: string, nextStatus: ServiceRequestStatus): Promise<boolean> {
  const current = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    select: { status: true, amcContractId: true },
  });
  if (!current) return false;

  await prisma.$transaction((tx) => applyStatus(tx, requestId, nextStatus, current));
  return true;
}

/**
 * The same status change, inside a transaction the caller already owns.
 *
 * A visit transition and the ticket status it implies have to move together:
 * a visit that closed while its ticket stayed in progress is a discrepancy
 * nobody would find until a customer asked about it.
 */
export async function setServiceRequestStatusIn(
  tx: Prisma.TransactionClient,
  requestId: string,
  nextStatus: ServiceRequestStatus,
  current: { status: ServiceRequestStatus; amcContractId: string | null },
): Promise<void> {
  if (current.status === nextStatus) return;
  await applyStatus(tx, requestId, nextStatus, current);
}
