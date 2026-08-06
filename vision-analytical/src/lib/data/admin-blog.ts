import 'server-only';
import { prisma } from '@/lib/db';

export function getAdminBlogPosts() {
  return prisma.blogPost.findMany({
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export function getAdminBlogPostById(id: string) {
  return prisma.blogPost.findUnique({ where: { id } });
}
