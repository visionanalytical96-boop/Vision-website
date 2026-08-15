import 'server-only';
import { prisma } from '@/lib/db';
import { ServiceRequestStatus, type Prisma } from '@/generated/prisma/client';

export function getAdminServiceRequests(status?: ServiceRequestStatus) {
  const where: Prisma.ServiceRequestWhereInput = status ? { status } : {};
  return prisma.serviceRequest.findMany({
    where,
    include: {
      customer: { select: { name: true, companyName: true } },
      assignedEngineer: { select: { name: true } },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });
}

export function getAdminServiceRequestById(id: string) {
  return prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, email: true, phone: true, companyName: true } },
      assignedEngineer: { select: { id: true, name: true } },
      amcContract: { select: { id: true, contractNumber: true, type: true, visitsIncluded: true, visitsUsed: true } },
      reports: { include: { engineer: { select: { name: true } } }, orderBy: { reportedAt: 'desc' } },
    },
  });
}
