import 'server-only';
import { prisma } from '@/lib/db';
import { ProductKind, type Prisma } from '@/generated/prisma/client';

export interface AdminProductFilters {
  kind?: ProductKind;
  query?: string;
}

export function getAdminProducts(filters: AdminProductFilters) {
  const where: Prisma.ProductWhereInput = {};
  if (filters.kind) where.kind = filters.kind;
  if (filters.query) {
    where.OR = [
      { name: { contains: filters.query, mode: 'insensitive' } },
      { sku: { contains: filters.query, mode: 'insensitive' } },
    ];
  }

  return prisma.product.findMany({
    where,
    include: { category: true },
    orderBy: { updatedAt: 'desc' },
  });
}

export function getAdminProductById(id: string) {
  return prisma.product.findUnique({ where: { id } });
}

export function getAllCategories() {
  return prisma.category.findMany({ orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }] });
}

export function getAdminRefurbishedInstruments() {
  return prisma.refurbishedInstrument.findMany({
    include: { category: true },
    orderBy: { updatedAt: 'desc' },
  });
}

export function getAdminRefurbishedById(id: string) {
  return prisma.refurbishedInstrument.findUnique({ where: { id } });
}
