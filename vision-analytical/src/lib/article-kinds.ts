import { ArticleKind } from '@/generated/prisma/enums';

export const ARTICLE_KINDS = Object.values(ArticleKind);

export const ARTICLE_KIND_LABELS: Record<ArticleKind, string> = {
  ARTICLE: 'Article',
  GUIDE: 'Guide',
  FAQ: 'FAQ',
  TROUBLESHOOTING: 'Troubleshooting',
  ERROR_CODE: 'Error code',
  CASE_STUDY: 'Case study',
  VIDEO: 'Video',
};

/** Plural, for filter chips and section headings. */
export const ARTICLE_KIND_PLURALS: Record<ArticleKind, string> = {
  ARTICLE: 'Articles',
  GUIDE: 'Guides',
  FAQ: 'FAQs',
  TROUBLESHOOTING: 'Troubleshooting',
  ERROR_CODE: 'Error codes',
  CASE_STUDY: 'Case studies',
  VIDEO: 'Videos',
};

export function isArticleKind(value: string | undefined): value is ArticleKind {
  return ARTICLE_KINDS.some((kind) => kind === value);
}

/**
 * Normalises an error code for comparison: manufacturers write the same code
 * as "E1201", "E-1201" and "E 1201", and a customer reads whichever one is on
 * the screen in front of them.
 */
export function normaliseErrorCode(code: string): string {
  return code.replace(/[^a-z0-9]/gi, '').toUpperCase();
}
