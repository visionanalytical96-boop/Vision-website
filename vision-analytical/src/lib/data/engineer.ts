import 'server-only';
import { prisma } from '@/lib/db';
import { ServiceRequestStatus, Priority } from '@/generated/prisma/client';

const ACTIVE_STATUSES: ServiceRequestStatus[] = [ServiceRequestStatus.ASSIGNED, ServiceRequestStatus.IN_PROGRESS];
const HISTORY_STATUSES: ServiceRequestStatus[] = [
  ServiceRequestStatus.COMPLETED,
  ServiceRequestStatus.CLOSED,
  ServiceRequestStatus.CANCELLED,
];

export function getEngineerActiveJobs(engineerId: string) {
  return prisma.serviceRequest.findMany({
    where: { assignedEngineerId: engineerId, status: { in: ACTIVE_STATUSES } },
    include: { customer: { select: { name: true, companyName: true } } },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  });
}

export function getEngineerJobHistory(engineerId: string) {
  return prisma.serviceRequest.findMany({
    where: { assignedEngineerId: engineerId, status: { in: HISTORY_STATUSES } },
    include: { customer: { select: { name: true, companyName: true } } },
    orderBy: { updatedAt: 'desc' },
  });
}

export function getEngineerJobById(engineerId: string, id: string) {
  return prisma.serviceRequest.findFirst({
    where: { id, assignedEngineerId: engineerId },
    include: {
      customer: { select: { name: true, email: true, phone: true, companyName: true } },
      amcContract: { select: { contractNumber: true, type: true, visitsIncluded: true, visitsUsed: true } },
      reports: { orderBy: { reportedAt: 'desc' } },
    },
  });
}

export async function getEngineerDashboardSummary(engineerId: string) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [activeCount, urgentCount, completedThisMonth] = await Promise.all([
    prisma.serviceRequest.count({ where: { assignedEngineerId: engineerId, status: { in: ACTIVE_STATUSES } } }),
    prisma.serviceRequest.count({
      where: { assignedEngineerId: engineerId, status: { in: ACTIVE_STATUSES }, priority: { in: [Priority.HIGH, Priority.URGENT] } },
    }),
    prisma.serviceRequest.count({
      where: { assignedEngineerId: engineerId, status: ServiceRequestStatus.COMPLETED, resolvedAt: { gte: monthStart } },
    }),
  ]);

  return { activeCount, urgentCount, completedThisMonth };
}
