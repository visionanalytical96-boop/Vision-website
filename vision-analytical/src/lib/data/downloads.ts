import 'server-only';
import { prisma } from '@/lib/db';
import type { DownloadKind, Prisma } from '@/generated/prisma/client';

export interface DownloadFilters {
  kind?: DownloadKind;
  brandSlug?: string;
  query?: string;
}

export function getPublishedDownloads(filters: DownloadFilters = {}) {
  const where: Prisma.DownloadWhereInput = { isPublished: true };

  if (filters.kind) where.kind = filters.kind;
  if (filters.brandSlug) where.brand = { slug: filters.brandSlug };
  if (filters.query) {
    where.OR = [
      { title: { contains: filters.query, mode: 'insensitive' } },
      { description: { contains: filters.query, mode: 'insensitive' } },
    ];
  }

  return prisma.download.findMany({
    where,
    include: { brand: true, category: true },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
  });
}

/** Brands that actually have something to download, for the filter row. */
export function getBrandsWithDownloads() {
  return prisma.brand.findMany({
    where: { isPublished: true, downloads: { some: { isPublished: true } } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export function getPublishedDownloadBySlug(slug: string) {
  return prisma.download.findFirst({ where: { slug, isPublished: true } });
}

/**
 * Counting is best-effort: a failed increment must never stop someone getting
 * their manual, so the caller does not await a rejection.
 */
export function recordDownload(id: string) {
  return prisma.download
    .update({ where: { id }, data: { downloadCount: { increment: 1 } } })
    .catch((error: unknown) => {
      console.error('Failed to record download:', error);
    });
}

/** Admin list - includes unpublished. */
export function getAllDownloads() {
  return prisma.download.findMany({
    include: { brand: true, category: true },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
  });
}

export function getDownloadById(id: string) {
  return prisma.download.findUnique({ where: { id } });
}
