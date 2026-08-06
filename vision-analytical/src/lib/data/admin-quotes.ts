import 'server-only';
import { prisma } from '@/lib/db';
import { QuoteStatus, type Prisma } from '@/generated/prisma/client';

export function getAdminQuotes(status?: QuoteStatus) {
  const where: Prisma.QuoteWhereInput = status ? { status } : {};
  return prisma.quote.findMany({
    where,
    include: { items: true, customer: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export function getAdminQuoteById(id: string) {
  return prisma.quote.findUnique({
    where: { id },
    include: { items: true, customer: { select: { name: true, email: true } }, order: true },
  });
}
