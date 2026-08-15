import 'server-only';
import { prisma } from '@/lib/db';
import { ACTIVE_STATUSES, TERMINAL_STATUSES } from '@/lib/service-visit';
import { Priority } from '@/generated/prisma/client';

/**
 * What an engineer needs on the job list: enough to decide where to go next
 * without opening every card. Deliberately narrow — this loads on a phone on
 * mobile data, often outside a building.
 */
const JOB_LIST_SELECT = {
  id: true,
  visitNumber: true,
  status: true,
  scheduledFor: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
  serviceRequest: {
    select: {
      ticketNumber: true,
      type: true,
      priority: true,
      instrumentDescription: true,
      customer: { select: { name: true, companyName: true, phone: true } },
    },
  },
  customerInstrument: {
    select: { nickname: true, serialNumber: true, siteName: true, city: true },
  },
} as const;

export function getEngineerVisits(engineerId: string) {
  return prisma.serviceVisit.findMany({
    where: { engineerId, status: { in: ACTIVE_STATUSES } },
    select: JOB_LIST_SELECT,
    orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
  });
}

export function getEngineerVisitHistory(engineerId: string, take = 50) {
  return prisma.serviceVisit.findMany({
    where: { engineerId, status: { in: TERMINAL_STATUSES } },
    select: JOB_LIST_SELECT,
    orderBy: { updatedAt: 'desc' },
    take,
  });
}

export function getEngineerVisitById(engineerId: string, id: string) {
  return prisma.serviceVisit.findFirst({
    // Scoped by engineer, not just id: a visit id in the URL must not open
    // somebody else's job.
    where: { id, engineerId },
    include: {
      serviceRequest: {
        select: {
          id: true,
          ticketNumber: true,
          type: true,
          priority: true,
          status: true,
          instrumentDescription: true,
          description: true,
          customer: { select: { name: true, email: true, phone: true, companyName: true } },
          amcContract: { select: { contractNumber: true, type: true, visitsIncluded: true, visitsUsed: true } },
        },
      },
      customerInstrument: {
        select: {
          id: true,
          nickname: true,
          serialNumber: true,
          siteName: true,
          addressLine: true,
          city: true,
          state: true,
          postalCode: true,
          warrantyEndsOn: true,
          calibrationDueOn: true,
          instrumentModel: { select: { name: true, brand: { select: { name: true } } } },
        },
      },
      events: { orderBy: { createdAt: 'desc' } },
      reports: { orderBy: { reportedAt: 'desc' }, select: { id: true, kind: true, reportedAt: true, workPerformed: true } },
    },
  });
}

export async function getEngineerVisitSummary(engineerId: string) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [active, urgent, closedThisMonth] = await Promise.all([
    prisma.serviceVisit.count({ where: { engineerId, status: { in: ACTIVE_STATUSES } } }),
    prisma.serviceVisit.count({
      where: {
        engineerId,
        status: { in: ACTIVE_STATUSES },
        serviceRequest: { priority: { in: [Priority.HIGH, Priority.URGENT] } },
      },
    }),
    prisma.serviceVisit.count({ where: { engineerId, closedAt: { gte: monthStart } } }),
  ]);

  return { active, urgent, closedThisMonth };
}
