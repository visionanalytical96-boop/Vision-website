import 'server-only';
import { prisma } from '@/lib/db';
import { ProductKind } from '@/generated/prisma/client';

export interface SearchHit {
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  group: SearchGroup;
}

export type SearchGroup = 'Instruments' | 'Spare parts' | 'Refurbished' | 'Brands' | 'Knowledge Center';

export interface SearchResults {
  query: string;
  hits: SearchHit[];
  countsByGroup: Record<SearchGroup, number>;
  total: number;
}

const EMPTY_COUNTS: Record<SearchGroup, number> = {
  Instruments: 0,
  'Spare parts': 0,
  Refurbished: 0,
  Brands: 0,
  'Knowledge Center': 0,
};

/**
 * Case-insensitive substring search across everything a visitor might look
 * for. Deliberately `contains` rather than full-text: the catalogue is small,
 * and part numbers like "228-45103-91" are exactly what people paste in —
 * tsvector tokenisation would break them apart. Revisit if the catalogue grows
 * past a few thousand rows, at which point a tsvector column with a trigram
 * index for part numbers is the upgrade.
 */
export async function search(rawQuery: string, perGroupLimit = 8): Promise<SearchResults> {
  const query = rawQuery.trim();
  if (query.length < 2) {
    return { query, hits: [], countsByGroup: { ...EMPTY_COUNTS }, total: 0 };
  }

  const contains = { contains: query, mode: 'insensitive' as const };

  const [products, refurbished, brands, posts] = await Promise.all([
    prisma.product.findMany({
      where: {
        isPublished: true,
        OR: [{ name: contains }, { sku: contains }, { description: contains }],
      },
      include: { category: true, brand: true },
      orderBy: { name: 'asc' },
      take: perGroupLimit * 2,
    }),
    prisma.refurbishedInstrument.findMany({
      where: {
        isPublished: true,
        OR: [{ name: contains }, { model: contains }, { description: contains }],
      },
      include: { category: true, brand: true },
      orderBy: { name: 'asc' },
      take: perGroupLimit,
    }),
    prisma.brand.findMany({
      where: { isPublished: true, OR: [{ name: contains }, { description: contains }] },
      orderBy: { name: 'asc' },
      take: perGroupLimit,
    }),
    prisma.blogPost.findMany({
      where: { isPublished: true, OR: [{ title: contains }, { excerpt: contains }, { content: contains }] },
      orderBy: { publishedAt: 'desc' },
      take: perGroupLimit,
    }),
  ]);

  const hits: SearchHit[] = [];

  for (const product of products) {
    const isPart = product.kind === ProductKind.SPARE_PART;
    hits.push({
      id: product.id,
      title: product.name,
      subtitle: [product.brand?.name, product.sku].filter(Boolean).join(' · ') || null,
      href: isPart ? `/spare-parts/${product.slug}` : `/products/${product.category.slug}/${product.slug}`,
      group: isPart ? 'Spare parts' : 'Instruments',
    });
  }
  for (const unit of refurbished) {
    hits.push({
      id: unit.id,
      title: unit.name,
      subtitle: [unit.brand.name, unit.model].filter(Boolean).join(' · ') || null,
      href: `/refurbished/${unit.category.slug}/${unit.slug}`,
      group: 'Refurbished',
    });
  }
  for (const brand of brands) {
    hits.push({
      id: brand.id,
      title: brand.name,
      subtitle: 'Instruments, spare parts & service',
      href: `/brands/${brand.slug}`,
      group: 'Brands',
    });
  }
  for (const post of posts) {
    hits.push({ id: post.id, title: post.title, subtitle: post.excerpt, href: `/blog/${post.slug}`, group: 'Knowledge Center' });
  }

  const countsByGroup = { ...EMPTY_COUNTS };
  for (const hit of hits) countsByGroup[hit.group] += 1;

  return { query, hits, countsByGroup, total: hits.length };
}
