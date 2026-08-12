import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { publiclyVisibleWhere } from '@/lib/content-status';
import { CategoryKind, ProductKind } from '@/generated/prisma/client';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

const STATIC_ROUTES = ['', '/about', '/services', '/contact', '/products', '/spare-parts', '/refurbished', '/blog'];

// Products/posts are added via the admin panel between deploys - refresh
// hourly rather than only regenerating on the next build.
export const revalidate = 3600;

async function getDynamicEntries(): Promise<MetadataRoute.Sitemap> {
  // Falls back to just the static routes if the database isn't reachable
  // (e.g. mid-build, before migrations have run) rather than failing the build.
  try {
    const [instrumentCategories, refurbishedCategories, instruments, spareParts, refurbishedUnits, posts] = await Promise.all([
      prisma.category.findMany({ where: { kind: CategoryKind.INSTRUMENT }, select: { slug: true } }),
      prisma.category.findMany({ where: { kind: CategoryKind.REFURBISHED }, select: { slug: true } }),
      prisma.product.findMany({
        where: { kind: ProductKind.INSTRUMENT, isPublished: true },
        select: { slug: true, updatedAt: true, category: { select: { slug: true } } },
      }),
      prisma.product.findMany({
        where: { kind: ProductKind.SPARE_PART, isPublished: true },
        select: { slug: true, updatedAt: true },
      }),
      prisma.refurbishedInstrument.findMany({
        where: { isPublished: true },
        select: { slug: true, updatedAt: true, category: { select: { slug: true } } },
      }),
      prisma.blogPost.findMany({
        where: publiclyVisibleWhere(),
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const categoryEntries: MetadataRoute.Sitemap = [
      ...instrumentCategories.map((c) => ({ url: `${SITE_URL}/products/${c.slug}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
      ...refurbishedCategories.map((c) => ({ url: `${SITE_URL}/refurbished/${c.slug}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ];

    const instrumentEntries: MetadataRoute.Sitemap = instruments.map((p) => ({
      url: `${SITE_URL}/products/${p.category.slug}/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    const sparePartEntries: MetadataRoute.Sitemap = spareParts.map((p) => ({
      url: `${SITE_URL}/spare-parts/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    const refurbishedEntries: MetadataRoute.Sitemap = refurbishedUnits.map((r) => ({
      url: `${SITE_URL}/refurbished/${r.category.slug}/${r.slug}`,
      lastModified: r.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    const blogEntries: MetadataRoute.Sitemap = posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.6,
    }));

    return [...categoryEntries, ...instrumentEntries, ...sparePartEntries, ...refurbishedEntries, ...blogEntries];
  } catch (error) {
    console.error('Sitemap: database unreachable, generating static routes only:', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.7,
  }));

  const dynamicEntries = await getDynamicEntries();

  return [...staticEntries, ...dynamicEntries];
}
