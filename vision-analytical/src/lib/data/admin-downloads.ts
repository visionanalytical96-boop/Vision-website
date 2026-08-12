import 'server-only';
import { prisma } from '@/lib/db';

/** Brand and category pickers for the download editor. */
export async function getDownloadFormOptions() {
  const [brands, categories, products] = await Promise.all([
    prisma.brand.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.category.findMany({ select: { id: true, name: true, kind: true }, orderBy: { name: 'asc' } }),
    prisma.product.findMany({ select: { id: true, name: true, sku: true }, orderBy: { name: 'asc' } }),
  ]);

  return {
    brands,
    products: products.map((product) => ({ id: product.id, name: `${product.name} (${product.sku})` })),
    // The same technique name exists under several kinds, so the kind has to
    // show or the two entries are indistinguishable in the dropdown.
    categories: categories.map((category) => ({ id: category.id, name: `${category.name} (${category.kind})` })),
  };
}
