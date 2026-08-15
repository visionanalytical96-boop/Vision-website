import 'server-only';
import { prisma } from '@/lib/db';
import { CategoryKind, ProductKind, StockStatus, type Prisma } from '@/generated/prisma/client';

export function getInstrumentCategories() {
  return prisma.category.findMany({
    where: { kind: CategoryKind.INSTRUMENT },
    orderBy: { sortOrder: 'asc' },
  });
}

export function getCategoryBySlug(slug: string, kind: CategoryKind) {
  return prisma.category.findFirst({ where: { slug, kind } });
}

export interface InstrumentFilters {
  categoryId?: string;
  brandSlug?: string;
  inStockOnly?: boolean;
  sort?: InstrumentSort;
}

export type InstrumentSort = 'name' | 'newest' | 'price-asc' | 'price-desc';

function instrumentWhere(filters: InstrumentFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { kind: ProductKind.INSTRUMENT, isPublished: true };
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.brandSlug) where.brand = { slug: filters.brandSlug };
  if (filters.inStockOnly) {
    where.stockStatus = { in: [StockStatus.IN_STOCK, StockStatus.LOW_STOCK] };
  }
  return where;
}

function instrumentOrderBy(sort: InstrumentSort = 'name'): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case 'newest':
      return { createdAt: 'desc' };
    // Unpriced items sort last either way: "contact for pricing" at the top of
    // a price-sorted list tells the visitor nothing.
    case 'price-asc':
      return { priceMinor: { sort: 'asc', nulls: 'last' } };
    case 'price-desc':
      return { priceMinor: { sort: 'desc', nulls: 'last' } };
    default:
      return { name: 'asc' };
  }
}

export function getPublishedInstruments(filters: InstrumentFilters) {
  return prisma.product.findMany({
    where: instrumentWhere(filters),
    include: { brand: true, category: true },
    orderBy: instrumentOrderBy(filters.sort),
  });
}

/** Brand and stock facets for the instrument catalogue, counted post-filter. */
export async function getInstrumentFacets(filters: InstrumentFilters) {
  const [brandGroups, brands, total, inStock] = await Promise.all([
    prisma.product.groupBy({
      by: ['brandId'],
      where: instrumentWhere({ ...filters, brandSlug: undefined }),
      _count: { _all: true },
    }),
    prisma.brand.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true },
    }),
    prisma.product.count({ where: instrumentWhere(filters) }),
    prisma.product.count({ where: instrumentWhere({ ...filters, inStockOnly: true }) }),
  ]);

  const countByBrandId = new Map(brandGroups.map((group) => [group.brandId, group._count._all]));

  return {
    total,
    inStock,
    brands: brands
      .map((brand) => ({ ...brand, count: countByBrandId.get(brand.id) ?? 0 }))
      .filter((brand) => brand.count > 0),
  };
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
    include: {
      category: true,
      brand: true,
      specifications: { orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] },
      compatibility: {
        include: { brand: true, instrumentModel: true },
        orderBy: [{ brand: { sortOrder: 'asc' } }],
      },
      documents: { where: { isPublished: true }, orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] },
    },
  });
}

/**
 * Parts that fit the same instruments as this product. Used on an instrument
 * page to surface its consumables, and on a part page to show alternatives.
 */
export async function getRelatedSpareParts(productId: string, limit = 4) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      brandId: true,
      compatibility: { select: { brandId: true, instrumentModelId: true } },
    },
  });
  if (!product) return [];

  const modelIds = product.compatibility.map((row) => row.instrumentModelId).filter((id) => id !== null);
  const brandIds = [...new Set([...product.compatibility.map((row) => row.brandId), product.brandId])].filter(
    (id) => id !== null,
  );
  if (modelIds.length === 0 && brandIds.length === 0) return [];

  return prisma.product.findMany({
    where: {
      id: { not: productId },
      kind: ProductKind.SPARE_PART,
      isPublished: true,
      compatibility: {
        some: {
          OR: [
            ...(modelIds.length > 0 ? [{ instrumentModelId: { in: modelIds } }] : []),
            ...(brandIds.length > 0 ? [{ brandId: { in: brandIds } }] : []),
          ],
        },
      },
    },
    include: { brand: true, category: true },
    orderBy: { name: 'asc' },
    take: limit,
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
