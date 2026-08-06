import 'server-only';
import { prisma } from '@/lib/db';
import { Role, type Prisma } from '@/generated/prisma/client';

export function getAdminCustomers(query?: string) {
  const where: Prisma.UserWhereInput = { role: Role.CUSTOMER };
  if (query) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
      { companyName: { contains: query, mode: 'insensitive' } },
    ];
  }

  return prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      companyName: true,
      isActive: true,
      createdAt: true,
      _count: { select: { orders: true, quotes: true, serviceRequests: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export function getAdminCustomerById(id: string) {
  return prisma.user.findFirst({
    where: { id, role: Role.CUSTOMER },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      companyName: true,
      isActive: true,
      createdAt: true,
    },
  });
}
