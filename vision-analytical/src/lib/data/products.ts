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
    include: { brand: true },
    orderBy: { name: 'asc' },
  });
}

export function getPublishedProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, isPublished: true },
    include: { category: true, brand: true },
  });
}

/**
 * The homepage's curated selection. Falls back to the newest published items
 * so the section is never blank on a fresh install, and preserves the admin's
 * chosen order (the database can't order by an arbitrary list of slugs).
 */
export async function getFeaturedProducts(slugs: string[], limit = 4) {
  if (slugs.length === 0) {
    return prisma.product.findMany({
      where: { isPublished: true },
      include: { category: true, brand: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  const products = await prisma.product.findMany({
    where: { slug: { in: slugs }, isPublished: true },
    include: { category: true, brand: true },
  });
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  return slugs.flatMap((slug) => bySlug.get(slug) ?? []);
}
