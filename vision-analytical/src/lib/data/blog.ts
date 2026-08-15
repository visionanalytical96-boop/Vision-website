import 'server-only';
import { prisma } from '@/lib/db';
import { publiclyVisibleWhere } from '@/lib/content-status';

export function getPublishedBlogPosts() {
  return prisma.knowledgeArticle.findMany({
    where: publiclyVisibleWhere(),
    include: { topic: { select: { name: true, slug: true } } },
    orderBy: { publishedAt: 'desc' },
  });
}

/** Newest articles, for the homepage Knowledge Center preview. */
export function getLatestBlogPosts(limit = 3) {
  return prisma.knowledgeArticle.findMany({
    where: publiclyVisibleWhere(),
    include: { topic: { select: { name: true, slug: true } } },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  });
}

export function getPublishedBlogPostBySlug(slug: string) {
  return prisma.knowledgeArticle.findFirst({
    where: { slug, ...publiclyVisibleWhere() },
    include: { author: { select: { name: true } } },
  });
}
