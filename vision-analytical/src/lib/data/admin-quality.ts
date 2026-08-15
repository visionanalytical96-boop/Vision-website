import 'server-only';
import { prisma } from '@/lib/db';
import { ContentStatus, ProductKind, type Prisma } from '@/generated/prisma/client';

export interface QualityIssue {
  key: string;
  label: string;
  description: string;
  count: number;
  /** Where to go to fix it. */
  href: string;
  samples: { id: string; name: string; href: string }[];
}

export interface QualityReport {
  issues: QualityIssue[];
  totalProducts: number;
  completeProducts: number;
  /** Share of products with no outstanding issue, 0-100. */
  completionPercent: number;
}

/**
 * A product is "incomplete" on any of these. Kept as one list so the summary
 * and the per-issue counts can never disagree - both derive from it.
 */
const PRODUCT_CHECKS: { key: string; label: string; description: string; where: Prisma.ProductWhereInput }[] = [
  {
    key: 'missing-images',
    label: 'Missing a photo',
    description: 'Products with no image. These render as a placeholder icon on the public site.',
    where: { images: { equals: [] } },
  },
  {
    key: 'missing-specifications',
    label: 'Missing specifications',
    description: 'No specification rows, so the product page has nothing to tabulate.',
    where: { specifications: { none: {} } },
  },
  {
    key: 'missing-compatibility',
    label: 'Missing compatibility',
    description: 'Spare parts with no compatibility mapping never appear in the parts finder.',
    where: { kind: ProductKind.SPARE_PART, compatibility: { none: {} } },
  },
  {
    key: 'missing-documents',
    label: 'Missing documents',
    description: 'No datasheet or manual attached.',
    where: { documents: { none: {} } },
  },
  {
    key: 'missing-seo',
    label: 'Missing SEO text',
    description: 'No SEO title or description, so search engines fall back to the raw content.',
    where: { OR: [{ seoTitle: null }, { seoDescription: null }] },
  },
  {
    key: 'missing-price',
    label: 'No price set',
    description: 'Shows as "Contact for pricing". Fine deliberately — worth reviewing in bulk.',
    where: { priceMinor: null },
  },
];

async function productIssue(check: (typeof PRODUCT_CHECKS)[number]): Promise<QualityIssue> {
  const where: Prisma.ProductWhereInput = { isPublished: true, ...check.where };
  const [count, samples] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 5 }),
  ]);

  return {
    ...check,
    count,
    href: '/admin/products',
    samples: samples.map((product) => ({
      id: product.id,
      name: product.name,
      href: `/admin/products/${product.id}`,
    })),
  };
}

export async function getQualityReport(): Promise<QualityReport> {
  const [issues, totalProducts, incompleteProducts] = await Promise.all([
    Promise.all(PRODUCT_CHECKS.map(productIssue)),
    prisma.product.count({ where: { isPublished: true } }),
    // A product counts once no matter how many checks it trips.
    prisma.product.count({ where: { isPublished: true, OR: PRODUCT_CHECKS.map((check) => check.where) } }),
  ]);

  const completeProducts = totalProducts - incompleteProducts;

  return {
    issues: issues.filter((issue) => issue.count > 0),
    totalProducts,
    completeProducts,
    completionPercent: totalProducts === 0 ? 100 : Math.round((completeProducts / totalProducts) * 100),
  };
}

/** Content sitting in the workflow, so nothing quietly stalls in review. */
export async function getContentQueue() {
  const [inReview, approved, drafts, scheduled] = await Promise.all([
    prisma.knowledgeArticle.findMany({
      where: { status: ContentStatus.IN_REVIEW },
      select: { id: true, title: true, reviewNote: true, updatedAt: true },
      orderBy: { updatedAt: 'asc' },
    }),
    prisma.knowledgeArticle.count({ where: { status: ContentStatus.APPROVED } }),
    prisma.knowledgeArticle.count({ where: { status: ContentStatus.DRAFT } }),
    prisma.knowledgeArticle.findMany({
      where: { status: ContentStatus.PUBLISHED, publishAt: { gt: new Date() } },
      select: { id: true, title: true, publishAt: true },
      orderBy: { publishAt: 'asc' },
    }),
  ]);

  return { inReview, approved, drafts, scheduled };
}

export interface BrokenImage {
  url: string;
  usedBy: string;
  href: string;
}

/**
 * Images referenced in the database whose file is no longer on disk. This
 * happens when uploads and the database drift apart - a restored backup, a
 * container rebuilt without its volume, a file deleted from the media library
 * while something still points at it. The public site renders these as a
 * broken image, and next/image answers 400, so it's worth surfacing.
 *
 * Only local /uploads paths are checked; an off-site URL is somebody else's
 * uptime and not something a filesystem check can answer.
 */
export async function getBrokenImages(): Promise<BrokenImage[]> {
  const [{ access }, path] = await Promise.all([import('node:fs/promises'), import('node:path')]);
  const uploadsRoot = path.join(process.cwd(), 'public');

  const [products, posts] = await Promise.all([
    prisma.product.findMany({ where: { isPublished: true }, select: { id: true, name: true, images: true } }),
    prisma.knowledgeArticle.findMany({ where: { coverImage: { not: null } }, select: { id: true, title: true, coverImage: true } }),
  ]);

  const candidates: BrokenImage[] = [];
  for (const product of products) {
    const images = Array.isArray(product.images) ? product.images : [];
    for (const image of images) {
      if (typeof image === 'string' && image.startsWith('/uploads/')) {
        candidates.push({ url: image, usedBy: product.name, href: `/admin/products/${product.id}` });
      }
    }
  }
  for (const post of posts) {
    if (post.coverImage?.startsWith('/uploads/')) {
      candidates.push({ url: post.coverImage, usedBy: post.title, href: `/admin/blog/${post.id}` });
    }
  }

  const checks = await Promise.all(
    candidates.map(async (candidate) => {
      const filePath = path.join(uploadsRoot, candidate.url);
      // Refuse to stat outside public/ even though these values are admin-set.
      if (!filePath.startsWith(uploadsRoot + path.sep)) return candidate;
      try {
        await access(filePath);
        return null;
      } catch {
        return candidate;
      }
    }),
  );

  return checks.filter((candidate) => candidate !== null);
}

/** Instrument models nobody has mapped a part to yet. */
export function getUnmappedInstrumentModels() {
  return prisma.instrumentModel.findMany({
    where: { compatibility: { none: {} } },
    include: { brand: { select: { name: true } } },
    orderBy: [{ brand: { sortOrder: 'asc' } }, { name: 'asc' }],
    take: 20,
  });
}
