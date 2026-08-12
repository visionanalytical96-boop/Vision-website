import 'server-only';
import { prisma } from '@/lib/db';
import type { BlogCategory } from '@/generated/prisma/client';

export function getPublishedBlogPosts(category?: BlogCategory) {
  return prisma.blogPost.findMany({
    where: { isPublished: true, ...(category ? { category } : {}) },
    orderBy: { publishedAt: 'desc' },
  });
}

/** Newest articles, for the homepage Knowledge Center preview. */
export function getLatestBlogPosts(limit = 3) {
  return prisma.blogPost.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  });
}

export function getPublishedBlogPostBySlug(slug: string) {
  return prisma.blogPost.findFirst({
    where: { slug, isPublished: true },
    include: { author: { select: { name: true } } },
  });
}
