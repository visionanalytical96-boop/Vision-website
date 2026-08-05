import 'server-only';
import { prisma } from '@/lib/db';
import { CategoryKind } from '@/generated/prisma/client';

export function getRefurbishedCategories() {
  return prisma.category.findMany({
    where: { kind: CategoryKind.REFURBISHED },
    orderBy: { sortOrder: 'asc' },
  });
}

export function getRefurbishedCategoryBySlug(slug: string) {
  return prisma.category.findFirst({ where: { slug, kind: CategoryKind.REFURBISHED } });
}

export function getRefurbishedInstrumentsByCategory(categoryId: string) {
  return prisma.refurbishedInstrument.findMany({
    where: { categoryId, isPublished: true },
    orderBy: { name: 'asc' },
  });
}

export function getRefurbishedInstrumentBySlug(slug: string) {
  return prisma.refurbishedInstrument.findFirst({
    where: { slug, isPublished: true },
    include: { category: true },
  });
}
