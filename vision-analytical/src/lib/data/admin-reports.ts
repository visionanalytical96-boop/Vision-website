import 'server-only';
import { prisma } from '@/lib/db';
import { OrderStatus } from '@/generated/prisma/client';

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function getAdminReports() {
  const monthStart = startOfMonth();

  const [
    revenueTotal,
    revenueThisMonth,
    ordersByStatus,
    quotesByStatus,
    serviceRequestsByStatus,
    amcByStatus,
    topProducts,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { not: OrderStatus.CANCELLED } },
      _sum: { totalMinor: true },
      _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: { status: { not: OrderStatus.CANCELLED }, createdAt: { gte: monthStart } },
      _sum: { totalMinor: true },
      _count: { _all: true },
    }),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.quote.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.serviceRequest.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.amcContract.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.orderItem.groupBy({
      by: ['nameSnapshot'],
      where: { order: { status: { not: OrderStatus.CANCELLED } } },
      _sum: { quantity: true, lineTotalMinor: true },
      orderBy: { _sum: { lineTotalMinor: 'desc' } },
      take: 5,
    }),
  ]);

  return {
    revenueTotalMinor: revenueTotal._sum.totalMinor ?? 0,
    orderCount: revenueTotal._count._all,
    revenueThisMonthMinor: revenueThisMonth._sum.totalMinor ?? 0,
    orderCountThisMonth: revenueThisMonth._count._all,
    ordersByStatus: ordersByStatus.map((row) => ({ status: row.status, count: row._count._all })),
    quotesByStatus: quotesByStatus.map((row) => ({ status: row.status, count: row._count._all })),
    serviceRequestsByStatus: serviceRequestsByStatus.map((row) => ({ status: row.status, count: row._count._all })),
    amcByStatus: amcByStatus.map((row) => ({ status: row.status, count: row._count._all })),
    topProducts: topProducts.map((row) => ({
      name: row.nameSnapshot,
      quantity: row._sum.quantity ?? 0,
      revenueMinor: row._sum.lineTotalMinor ?? 0,
    })),
  };
}
