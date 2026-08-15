import 'server-only';
import { prisma } from '@/lib/db';
import { CategoryKind, ProductKind, StockStatus, type Prisma } from '@/generated/prisma/client';

export function getSparePartCategories() {
  return prisma.category.findMany({
    where: { kind: CategoryKind.SPARE_PART },
    orderBy: { sortOrder: 'asc' },
  });
}

export interface SparePartFilters {
  categorySlug?: string;
  /** Brand slug - matches a compatibility claim, not the part's own brand. */
  brandSlug?: string;
  /** "brand-slug/model-slug", from the parts finder. */
  modelBrandSlug?: string;
  modelSlug?: string;
  inStockOnly?: boolean;
  query?: string;
}

function sparePartWhere(filters: SparePartFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    kind: ProductKind.SPARE_PART,
    isPublished: true,
  };

  if (filters.categorySlug) {
    where.category = { slug: filters.categorySlug };
  }
  if (filters.brandSlug) {
    where.compatibility = { some: { brand: { slug: filters.brandSlug } } };
  }
  if (filters.modelSlug && filters.modelBrandSlug) {
    // A part fits an instrument if it names that model, or if it is a
    // brand-wide fitting for that model's brand - which is how most
    // consumables are actually sold.
    where.compatibility = {
      some: {
        brand: { slug: filters.modelBrandSlug },
        OR: [
          { instrumentModel: { slug: filters.modelSlug } },
          { instrumentModelId: null },
        ],
      },
    };
  }
  if (filters.inStockOnly) {
    where.stockStatus = { in: [StockStatus.IN_STOCK, StockStatus.LOW_STOCK] };
  }
  if (filters.query) {
    where.OR = [
      { name: { contains: filters.query, mode: 'insensitive' } },
      { sku: { contains: filters.query, mode: 'insensitive' } },
      { description: { contains: filters.query, mode: 'insensitive' } },
    ];
  }

  return where;
}

export function getSpareParts(filters: SparePartFilters) {
  return prisma.product.findMany({
    where: sparePartWhere(filters),
    include: { brand: true, category: true },
    orderBy: { name: 'asc' },
  });
}

/**
 * Facet counts computed against the *other* active filters, so a count tells
 * you what you'd get by clicking - not a global total that turns out to be
 * zero once the current filters still apply.
 */
export async function getSparePartFacets(filters: SparePartFilters) {
  const [categoryGroups, compatibilityRows, brands, total] = await Promise.all([
    prisma.product.groupBy({
      by: ['categoryId'],
      where: sparePartWhere({ ...filters, categorySlug: undefined }),
      _count: { _all: true },
    }),
    // Rows rather than a groupBy count: one product can hold several
    // compatibility rows for the same brand (one brand-wide plus per-model),
    // and counting rows would report a brand as having more parts than it has.
    prisma.productCompatibility.findMany({
      where: { product: sparePartWhere({ ...filters, brandSlug: undefined }) },
      select: { brandId: true, productId: true },
    }),
    prisma.brand.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true },
    }),
    prisma.product.count({ where: sparePartWhere(filters) }),
  ]);

  const productIdsByBrandId = new Map<string, Set<string>>();
  for (const row of compatibilityRows) {
    const set = productIdsByBrandId.get(row.brandId) ?? new Set<string>();
    set.add(row.productId);
    productIdsByBrandId.set(row.brandId, set);
  }

  return {
    total,
    countByCategoryId: new Map(categoryGroups.map((group) => [group.categoryId, group._count._all])),
    brands: brands
      .map((brand) => ({ ...brand, count: productIdsByBrandId.get(brand.id)?.size ?? 0 }))
      .filter((brand) => brand.count > 0),
  };
}

export function getSparePartBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, kind: ProductKind.SPARE_PART, isPublished: true },
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
