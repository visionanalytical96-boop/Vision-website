import 'server-only';
import { prisma } from '@/lib/db';
import { CategoryKind } from '@/generated/prisma/client';

export function getInstrumentCategories() {
  return prisma.category.findMany({
    where: { kind: CategoryKind.INSTRUMENT },
    orderBy: { sortOrder: 'asc' },
  });
}

export function getCategoryBySlug(slug: string, kind: CategoryKind) {
  return prisma.category.findFirst({ where: { slug, kind } });
}

export function getPublishedProductsByCategory(categoryId: string) {
  return prisma.product.findMany({
    where: { categoryId, isPublished: true },
    orderBy: { name: 'asc' },
  });
}

export function getPublishedProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, isPublished: true },
    include: { category: true },
  });
}
