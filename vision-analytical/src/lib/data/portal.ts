import 'server-only';
import { prisma } from '@/lib/db';
import { QuoteStatus, OrderStatus, ServiceRequestStatus, AmcStatus } from '@/generated/prisma/client';

export function getCustomerOrders(customerId: string) {
  return prisma.order.findMany({
    where: { customerId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
}

export function getCustomerOrderById(customerId: string, id: string) {
  return prisma.order.findFirst({
    where: { id, customerId },
    include: { items: true, invoices: true },
  });
}

export function getCustomerQuotes(customerId: string) {
  return prisma.quote.findMany({
    where: { customerId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
}

export function getCustomerQuoteById(customerId: string, id: string) {
  return prisma.quote.findFirst({
    where: { id, customerId },
    include: { items: true },
  });
}

export function getCustomerServiceRequests(customerId: string) {
  return prisma.serviceRequest.findMany({
    where: { customerId },
    include: { assignedEngineer: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export function getCustomerServiceRequestById(customerId: string, id: string) {
  return prisma.serviceRequest.findFirst({
    where: { id, customerId },
    include: {
      assignedEngineer: { select: { name: true } },
      reports: { orderBy: { reportedAt: 'desc' } },
      amcContract: true,
    },
  });
}

export function getCustomerAmcContracts(customerId: string) {
  return prisma.amcContract.findMany({
    where: { customerId },
    orderBy: { endDate: 'asc' },
  });
}

export function getCustomerInvoices(customerId: string) {
  return prisma.invoice.findMany({
    where: { customerId },
    orderBy: { issuedAt: 'desc' },
  });
}

export interface PortalSummary {
  pendingQuotesCount: number;
  activeOrdersCount: number;
  openServiceRequestsCount: number;
  nextAmcExpiry: Date | null;
}

export async function getPortalSummary(customerId: string): Promise<PortalSummary> {
  const [pendingQuotesCount, activeOrdersCount, openServiceRequestsCount, nextAmc] = await Promise.all([
    prisma.quote.count({
      where: { customerId, status: { in: [QuoteStatus.REQUESTED, QuoteStatus.SENT] } },
    }),
    prisma.order.count({
      where: {
        customerId,
        status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED] },
      },
    }),
    prisma.serviceRequest.count({
      where: {
        customerId,
        status: { in: [ServiceRequestStatus.OPEN, ServiceRequestStatus.ASSIGNED, ServiceRequestStatus.IN_PROGRESS] },
      },
    }),
    prisma.amcContract.findFirst({
      where: { customerId, status: { in: [AmcStatus.ACTIVE, AmcStatus.EXPIRING_SOON] } },
      orderBy: { endDate: 'asc' },
      select: { endDate: true },
    }),
  ]);

  return {
    pendingQuotesCount,
    activeOrdersCount,
    openServiceRequestsCount,
    nextAmcExpiry: nextAmc?.endDate ?? null,
  };
}
