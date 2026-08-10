import 'server-only';
import { prisma } from '@/lib/db';
import { HomeSectionKey, type ContentPageKey } from '@/generated/prisma/client';

export function getAdminHomeSections() {
  return prisma.homeSection.findMany({ orderBy: { sortOrder: 'asc' } });
}

export function getAdminHomeSectionByKey(key: HomeSectionKey) {
  return prisma.homeSection.findUnique({ where: { key } });
}

export function getAdminPageContent(page: ContentPageKey) {
  return prisma.pageContent.findUnique({ where: { page } });
}

export function isHomeSectionKey(value: string): value is HomeSectionKey {
  return (Object.values(HomeSectionKey) as string[]).includes(value);
}
