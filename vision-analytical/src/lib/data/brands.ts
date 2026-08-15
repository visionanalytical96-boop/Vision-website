import 'server-only';
import { prisma } from '@/lib/db';

/** Brands shown on the public brands index and in the mega menu. */
export function getPublishedBrands() {
  return prisma.brand.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

/**
 * A brand hub: the brand plus everything Vision Analytical carries for it.
 * Instruments, spare parts and refurbished units are separated here rather than
 * in the page so the page stays a rendering concern.
 */
export async function getBrandHubBySlug(slug: string) {
  const brand = await prisma.brand.findFirst({
    where: { slug, isPublished: true },
    include: {
      products: {
        where: { isPublished: true },
        include: { category: true, brand: true },
        orderBy: { name: 'asc' },
      },
      refurbishedInstruments: {
        where: { isPublished: true },
        include: { category: true, brand: true },
        orderBy: { name: 'asc' },
      },
    },
  });
  if (!brand) return null;

  const instruments = brand.products.filter((product) => product.kind === 'INSTRUMENT');
  const spareParts = brand.products.filter((product) => product.kind === 'SPARE_PART');

  return { brand, instruments, spareParts, refurbished: brand.refurbishedInstruments };
}

/** Brand list for admin pickers - includes unpublished ones. */
export function getAllBrands() {
  return prisma.brand.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
}

/** Counts for the brands index, so a brand card can show what's behind it. */
export async function getBrandsWithCounts() {
  const brands = await prisma.brand.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { products: true, refurbishedInstruments: true } },
    },
  });
  return brands;
}
