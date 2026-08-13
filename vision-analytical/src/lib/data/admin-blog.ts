import 'server-only';
import { prisma } from '@/lib/db';
import { Role } from '@/generated/prisma/client';

export function getAdminBlogPosts() {
  return prisma.knowledgeArticle.findMany({
    include: { author: { select: { name: true } }, topic: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export function getAdminBlogPostById(id: string) {
  return prisma.knowledgeArticle.findUnique({
    where: { id },
    include: { links: true, tags: { include: { tag: true } } },
  });
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

/**
 * Who can be named as a reviewer: staff accounts, not customers. A customer
 * cannot sign off technical content.
 */
export async function getArticleReviewerOptions() {
  return prisma.user.findMany({
    where: { isActive: true, role: { in: [Role.ADMIN, Role.ENGINEER] } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
}
