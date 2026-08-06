import 'server-only';
import { prisma } from '@/lib/db';
import { StockStatus } from '@/generated/prisma/client';

export function getInventoryProducts() {
  return prisma.product.findMany({
    include: { category: true },
    orderBy: [{ stockStatus: 'asc' }, { name: 'asc' }],
  });
}

export function getLowStockCount() {
  return prisma.product.count({
    where: { stockStatus: { in: [StockStatus.LOW_STOCK, StockStatus.OUT_OF_STOCK] } },
  });
}

export function getSuppliers() {
  return prisma.supplier.findMany({ orderBy: { name: 'asc' } });
}

export function getRecentStockMovements(limit = 20) {
  return prisma.stockMovement.findMany({
    include: { product: { select: { name: true, sku: true } }, createdBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
