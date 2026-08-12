import 'server-only';
import { prisma } from '@/lib/db';
import { publiclyVisibleWhere } from '@/lib/content-status';
import type { BlogCategory } from '@/generated/prisma/client';

export function getPublishedBlogPosts(category?: BlogCategory) {
  return prisma.blogPost.findMany({
    where: { ...publiclyVisibleWhere(), ...(category ? { category } : {}) },
    orderBy: { publishedAt: 'desc' },
  });
}

/** Newest articles, for the homepage Knowledge Center preview. */
export function getLatestBlogPosts(limit = 3) {
  return prisma.blogPost.findMany({
    where: publiclyVisibleWhere(),
    orderBy: { publishedAt: 'desc' },
    take: limit,
  });
}

export function getPublishedBlogPostBySlug(slug: string) {
  return prisma.blogPost.findFirst({
    where: { slug, ...publiclyVisibleWhere() },
    include: { author: { select: { name: true } } },
  });
}
