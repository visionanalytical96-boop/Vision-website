import 'server-only';
import { prisma } from '@/lib/db';
import type { BlogCategory } from '@/generated/prisma/client';

export function getPublishedBlogPosts(category?: BlogCategory) {
  return prisma.blogPost.findMany({
    where: { isPublished: true, ...(category ? { category } : {}) },
    orderBy: { publishedAt: 'desc' },
  });
}

export function getPublishedBlogPostBySlug(slug: string) {
  return prisma.blogPost.findFirst({
    where: { slug, isPublished: true },
    include: { author: { select: { name: true } } },
  });
}
