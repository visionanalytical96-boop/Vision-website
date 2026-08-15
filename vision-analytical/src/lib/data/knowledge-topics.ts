import 'server-only';
import { cache } from 'react';
import { prisma } from '@/lib/db';
import { publiclyVisibleWhere } from '@/lib/content-status';
import { ContentStatus } from '@/generated/prisma/enums';

/** Topics an admin has left switched on, in their chosen order. */
export const getKnowledgeTopics = cache(async () => {
  return prisma.knowledgeTopic.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, description: true, icon: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
});

/** Every topic including the switched-off ones, for the admin list. */
export async function getAllKnowledgeTopics() {
  return prisma.knowledgeTopic.findMany({
    include: {
      category: { select: { name: true } },
      _count: { select: { articles: true, errorCodes: true, serviceCases: true, downloads: true } },
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export async function getKnowledgeTopicBySlug(slug: string) {
  return prisma.knowledgeTopic.findFirst({
    where: { slug, isActive: true },
    include: { category: { select: { slug: true, name: true } } },
  });
}

/**
 * What a topic actually holds, counted per surface.
 *
 * One query per surface rather than a join: they live in different tables and
 * a count is cheaper than assembling rows we would only measure.
 */
export async function getTopicContentCounts(topicId: string) {
  const [articles, errorCodes, serviceCases, documents] = await Promise.all([
    prisma.knowledgeArticle.count({ where: { topicId, ...publiclyVisibleWhere() } }),
    prisma.errorCode.count({ where: { topicId, status: ContentStatus.PUBLISHED } }),
    prisma.serviceCase.count({ where: { topicId, status: ContentStatus.PUBLISHED } }),
    prisma.download.count({ where: { topicId, isPublished: true } }),
  ]);
  return { articles, errorCodes, serviceCases, documents };
}

/** Tags in use, most-used first, for the tag cloud and the admin list. */
export async function getTags(limit = 40) {
  const tags = await prisma.tag.findMany({
    include: { _count: { select: { articles: true } } },
    orderBy: { articles: { _count: 'desc' } },
    take: limit,
  });
  // A tag with nothing on it is noise on a public page.
  return tags.filter((tag) => tag._count.articles > 0);
}
