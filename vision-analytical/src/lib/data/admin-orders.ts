import 'server-only';
import { prisma } from '@/lib/db';
import { OrderStatus, type Prisma } from '@/generated/prisma/client';

export function getAdminOrders(status?: OrderStatus) {
  const where: Prisma.OrderWhereInput = status ? { status } : {};
  return prisma.order.findMany({
    where,
    include: { customer: { select: { name: true, email: true } }, items: true },
    orderBy: { createdAt: 'desc' },
  });
}

export function getAdminOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, email: true, phone: true, companyName: true } },
      items: true,
      invoices: true,
    },
  });
}
