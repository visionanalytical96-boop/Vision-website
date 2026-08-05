import 'server-only';
import { prisma } from '@/lib/db';
import { CategoryKind, ProductKind, type Prisma } from '@/generated/prisma/client';

export const SPARE_PART_BRANDS = ['Shimadzu', 'Waters', 'Agilent Technologies', 'Thermo Scientific'];

export function getSparePartCategories() {
  return prisma.category.findMany({
    where: { kind: CategoryKind.SPARE_PART },
    orderBy: { sortOrder: 'asc' },
  });
}

export interface SparePartFilters {
  categorySlug?: string;
  brand?: string;
  query?: string;
}

export function getSpareParts(filters: SparePartFilters) {
  const where: Prisma.ProductWhereInput = {
    kind: ProductKind.SPARE_PART,
    isPublished: true,
  };

  if (filters.categorySlug) {
    where.category = { slug: filters.categorySlug };
  }
  if (filters.brand) {
    where.compatibleBrands = { has: filters.brand };
  }
  if (filters.query) {
    where.OR = [
      { name: { contains: filters.query, mode: 'insensitive' } },
      { description: { contains: filters.query, mode: 'insensitive' } },
    ];
  }

  return prisma.product.findMany({ where, orderBy: { name: 'asc' } });
}

export function getSparePartBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, kind: ProductKind.SPARE_PART, isPublished: true },
    include: { category: true },
  });
}
