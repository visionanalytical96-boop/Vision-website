import 'server-only';
import { prisma } from '@/lib/db';
import { Role, AmcStatus, type Prisma } from '@/generated/prisma/client';

export function getAdminAmcContracts(status?: AmcStatus) {
  const where: Prisma.AmcContractWhereInput = status ? { status } : {};
  return prisma.amcContract.findMany({
    where,
    include: { customer: { select: { name: true, companyName: true } } },
    orderBy: { endDate: 'asc' },
  });
}

export function getAdminAmcContractById(id: string) {
  return prisma.amcContract.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, email: true, phone: true, companyName: true } },
      serviceRequests: {
        select: { id: true, ticketNumber: true, status: true, createdAt: true, assignedEngineer: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

export function getCustomerOptions() {
  return prisma.user.findMany({
    where: { role: Role.CUSTOMER, isActive: true },
    select: { id: true, name: true, email: true, companyName: true },
    orderBy: { name: 'asc' },
  });
}
