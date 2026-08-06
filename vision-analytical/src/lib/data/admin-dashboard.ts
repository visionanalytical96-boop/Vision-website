import 'server-only';
import { prisma } from '@/lib/db';
import { Role, QuoteStatus, ServiceRequestStatus, StockStatus } from '@/generated/prisma/client';

export async function getAdminDashboardSummary() {
  const [totalProducts, lowStockCount, pendingQuotes, openServiceRequests, totalCustomers, recentOrders] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { stockStatus: { in: [StockStatus.LOW_STOCK, StockStatus.OUT_OF_STOCK] } } }),
    prisma.quote.count({ where: { status: { in: [QuoteStatus.REQUESTED, QuoteStatus.SENT] } } }),
    prisma.serviceRequest.count({ where: { status: { in: [ServiceRequestStatus.OPEN, ServiceRequestStatus.ASSIGNED, ServiceRequestStatus.IN_PROGRESS] } } }),
    prisma.user.count({ where: { role: Role.CUSTOMER } }),
    prisma.order.findMany({
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  return { totalProducts, lowStockCount, pendingQuotes, openServiceRequests, totalCustomers, recentOrders };
}
