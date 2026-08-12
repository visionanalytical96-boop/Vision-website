import 'server-only';
import { prisma } from '@/lib/db';
import { publiclyVisibleWhere } from '@/lib/content-status';
import { normaliseErrorCode } from '@/lib/article-kinds';
import { ArticleKind, type BlogCategory, type Prisma } from '@/generated/prisma/client';

export interface KnowledgeFilters {
  category?: BlogCategory;
  kind?: ArticleKind;
  query?: string;
}

function knowledgeWhere(filters: KnowledgeFilters): Prisma.KnowledgeArticleWhereInput {
  const where: Prisma.KnowledgeArticleWhereInput = { ...publiclyVisibleWhere() };
  if (filters.category) where.category = filters.category;
  if (filters.kind) where.kind = filters.kind;
  if (filters.query) {
    where.OR = [
      { title: { contains: filters.query, mode: 'insensitive' } },
      { excerpt: { contains: filters.query, mode: 'insensitive' } },
      { content: { contains: filters.query, mode: 'insensitive' } },
      { errorCode: { contains: filters.query, mode: 'insensitive' } },
    ];
  }
  return where;
}

export function getKnowledgeArticles(filters: KnowledgeFilters = {}) {
  return prisma.knowledgeArticle.findMany({
    where: knowledgeWhere(filters),
    orderBy: { publishedAt: 'desc' },
  });
}

/** Counts per kind, computed with the kind filter itself lifted. */
export async function getKnowledgeKindCounts(filters: KnowledgeFilters = {}) {
  const groups = await prisma.knowledgeArticle.groupBy({
    by: ['kind'],
    where: knowledgeWhere({ ...filters, kind: undefined }),
    _count: { _all: true },
  });
  return new Map(groups.map((group) => [group.kind, group._count._all]));
}

export function getKnowledgeArticleBySlug(slug: string) {
  return prisma.knowledgeArticle.findFirst({
    where: { slug, ...publiclyVisibleWhere() },
    include: {
      author: { select: { name: true } },
      links: {
        include: {
          brand: true,
          instrumentModel: { include: { brand: true } },
          product: { include: { category: true } },
        },
      },
    },
  });
}

/**
 * Best-effort view counting. A failed increment must never stop someone
 * reading, so the caller does not await a rejection.
 */
export function recordArticleView(id: string) {
  return prisma.knowledgeArticle
    .update({ where: { id }, data: { viewCount: { increment: 1 } } })
    .catch((error: unknown) => {
      console.error('Failed to record article view:', error);
    });
}

export interface ErrorCodeMatch {
  id: string;
  slug: string;
  title: string;
  errorCode: string;
  excerpt: string;
  brands: string[];
  models: string[];
}

/**
 * Error-code lookup. Codes are matched on their normalised form, so a customer
 * reading "E-1201" off a screen finds an article filed as "E1201".
 *
 * Normalising in the database would need a functional index; with a knowledge
 * base this size it is cheaper and clearer to normalise in memory. Revisit if
 * the error-code set grows into the thousands.
 */
export async function lookupErrorCodes(rawQuery: string): Promise<ErrorCodeMatch[]> {
  const articles = await prisma.knowledgeArticle.findMany({
    where: { ...publiclyVisibleWhere(), kind: ArticleKind.ERROR_CODE, errorCode: { not: null } },
    include: {
      links: { include: { brand: true, instrumentModel: { include: { brand: true } } } },
    },
    orderBy: { errorCode: 'asc' },
  });

  const needle = normaliseErrorCode(rawQuery.trim());
  const matched = needle.length === 0
    ? articles
    : articles.filter((article) => {
        const code = normaliseErrorCode(article.errorCode ?? '');
        return code.includes(needle) || needle.includes(code);
      });

  return matched.map((article) => ({
    id: article.id,
    slug: article.slug,
    title: article.title,
    errorCode: article.errorCode ?? '',
    excerpt: article.excerpt,
    brands: [...new Set(article.links.flatMap((link) => (link.brand ? [link.brand.name] : [])))],
    models: [
      ...new Set(
        article.links.flatMap((link) =>
          link.instrumentModel ? [`${link.instrumentModel.brand.name} ${link.instrumentModel.name}`] : [],
        ),
      ),
    ],
  }));
}

/**
 * Articles about a product: those linked to it directly, plus those linked to
 * its brand or to a model it fits. That last hop is what makes a troubleshooting
 * note written for an instrument show up on the lamp that goes in it.
 */
export async function getArticlesForProduct(productId: string, limit = 4) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { brandId: true, compatibility: { select: { brandId: true, instrumentModelId: true } } },
  });
  if (!product) return [];

  const brandIds = [...new Set([product.brandId, ...product.compatibility.map((row) => row.brandId)])].filter(
    (id) => id !== null,
  );
  const modelIds = product.compatibility.map((row) => row.instrumentModelId).filter((id) => id !== null);

  return prisma.knowledgeArticle.findMany({
    where: {
      ...publiclyVisibleWhere(),
      links: {
        some: {
          OR: [
            { productId },
            ...(modelIds.length > 0 ? [{ instrumentModelId: { in: modelIds } }] : []),
            ...(brandIds.length > 0 ? [{ brandId: { in: brandIds } }] : []),
          ],
        },
      },
    },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  });
}

/** Articles filed against a brand, for its hub page. */
export function getArticlesForBrand(brandId: string, limit = 6) {
  return prisma.knowledgeArticle.findMany({
    where: {
      ...publiclyVisibleWhere(),
      links: { some: { OR: [{ brandId }, { instrumentModel: { brandId } }] } },
    },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  });
}

/** Most-read published articles, for the Knowledge Center and analytics. */
export function getPopularArticles(limit = 5) {
  return prisma.knowledgeArticle.findMany({
    where: publiclyVisibleWhere(),
    orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
    take: limit,
  });
}
