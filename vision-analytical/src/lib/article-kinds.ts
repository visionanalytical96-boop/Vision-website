import { ArticleKind } from '@/generated/prisma/enums';

/**
 * What a piece of knowledge *is*. Separate from its topic, which is what it is
 * *about* — the two used to be one field, which left no way to file a
 * troubleshooting guide under HPLC.
 */
export const ARTICLE_KINDS = Object.values(ArticleKind);

export const ARTICLE_KIND_LABELS: Record<ArticleKind, string> = {
  ARTICLE: 'Knowledge article',
  GUIDE: 'Guide',
  FAQ: 'FAQ',
  TROUBLESHOOTING: 'Troubleshooting guide',
  ERROR_CODE: 'Error code',
  CASE_STUDY: 'Case study',
  VIDEO: 'Video',
  APPLICATION_NOTE: 'Application note',
  INSTALLATION_GUIDE: 'Installation guide',
  MAINTENANCE_GUIDE: 'Maintenance guide',
  CALIBRATION_GUIDE: 'Calibration guide',
  TRAINING_GUIDE: 'Training guide',
  BEST_PRACTICE: 'Best practice',
  RELEASE_NOTE: 'Release notes',
  PRODUCT_UPDATE: 'Product update',
};

/** Plural, for filter chips and section headings. */
export const ARTICLE_KIND_PLURALS: Record<ArticleKind, string> = {
  ARTICLE: 'Knowledge articles',
  GUIDE: 'Guides',
  FAQ: 'FAQs',
  TROUBLESHOOTING: 'Troubleshooting guides',
  ERROR_CODE: 'Error codes',
  CASE_STUDY: 'Case studies',
  VIDEO: 'Videos',
  APPLICATION_NOTE: 'Application notes',
  INSTALLATION_GUIDE: 'Installation guides',
  MAINTENANCE_GUIDE: 'Maintenance guides',
  CALIBRATION_GUIDE: 'Calibration guides',
  TRAINING_GUIDE: 'Training guides',
  BEST_PRACTICE: 'Best practices',
  RELEASE_NOTE: 'Release notes',
  PRODUCT_UPDATE: 'Product updates',
};

/** Lucide icon name per kind, so the hub can show a type without an upload. */
export const ARTICLE_KIND_ICONS: Record<ArticleKind, string> = {
  ARTICLE: 'FileText',
  GUIDE: 'BookOpen',
  FAQ: 'CircleHelp',
  TROUBLESHOOTING: 'Wrench',
  ERROR_CODE: 'TriangleAlert',
  CASE_STUDY: 'ClipboardList',
  VIDEO: 'Video',
  APPLICATION_NOTE: 'FlaskConical',
  INSTALLATION_GUIDE: 'PackagePlus',
  MAINTENANCE_GUIDE: 'Settings',
  CALIBRATION_GUIDE: 'Gauge',
  TRAINING_GUIDE: 'GraduationCap',
  BEST_PRACTICE: 'Sparkles',
  RELEASE_NOTE: 'Tag',
  PRODUCT_UPDATE: 'Megaphone',
};

/**
 * The order the hub lists types in: what people come looking for first, not
 * alphabetical. Troubleshooting and error codes are why someone opens a
 * knowledge base at 2am.
 */
export const ARTICLE_KIND_ORDER: ArticleKind[] = [
  ArticleKind.TROUBLESHOOTING,
  ArticleKind.ERROR_CODE,
  ArticleKind.MAINTENANCE_GUIDE,
  ArticleKind.CALIBRATION_GUIDE,
  ArticleKind.INSTALLATION_GUIDE,
  ArticleKind.APPLICATION_NOTE,
  ArticleKind.ARTICLE,
  ArticleKind.GUIDE,
  ArticleKind.FAQ,
  ArticleKind.BEST_PRACTICE,
  ArticleKind.TRAINING_GUIDE,
  ArticleKind.CASE_STUDY,
  ArticleKind.VIDEO,
  ArticleKind.RELEASE_NOTE,
  ArticleKind.PRODUCT_UPDATE,
];

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

/**
 * Roughly how long an article takes to read, at 200 words per minute.
 * Rounded up, and never zero — "0 min read" reads like a bug.
 */
export function readingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
