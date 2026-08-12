import 'server-only';
import { prisma } from '@/lib/db';

export function getAdminBlogPosts() {
  return prisma.knowledgeArticle.findMany({
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export function getAdminBlogPostById(id: string) {
  return prisma.knowledgeArticle.findUnique({ where: { id }, include: { links: true } });
}

/** Brand, model and product pickers for the article link editor. */
export async function getArticleLinkOptions() {
  const [brands, models, products] = await Promise.all([
    prisma.brand.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.instrumentModel.findMany({
      select: { id: true, name: true, brandId: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.product.findMany({ select: { id: true, name: true, sku: true }, orderBy: { name: 'asc' } }),
  ]);

  return {
    brands,
    models,
    products: products.map((product) => ({ id: product.id, name: `${product.name} (${product.sku})` })),
  };
}
