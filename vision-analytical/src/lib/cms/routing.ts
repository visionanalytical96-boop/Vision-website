import { HomeSectionKey } from '@/generated/prisma/enums';

// URL-friendly slugs for each homepage section, used in /admin/website/homepage/[slug].
const SLUG_TO_KEY: Record<string, HomeSectionKey> = {
  hero: HomeSectionKey.HERO,
  categories: HomeSectionKey.CATEGORIES,
  lifecycle: HomeSectionKey.LIFECYCLE,
  'why-us': HomeSectionKey.WHY_US,
  cta: HomeSectionKey.CTA,
};

const KEY_TO_SLUG: Record<HomeSectionKey, string> = {
  HERO: 'hero',
  CATEGORIES: 'categories',
  LIFECYCLE: 'lifecycle',
  WHY_US: 'why-us',
  CTA: 'cta',
};

const KEY_TO_LABEL: Record<HomeSectionKey, string> = {
  HERO: 'Hero',
  CATEGORIES: 'Instrument Categories',
  LIFECYCLE: 'Instrument Lifecycle',
  WHY_US: "Why Us",
  CTA: 'Bottom Call-to-Action',
};

export function homeSectionSlugToKey(slug: string): HomeSectionKey | null {
  return SLUG_TO_KEY[slug] ?? null;
}

export function homeSectionKeyToSlug(key: HomeSectionKey): string {
  return KEY_TO_SLUG[key];
}

export function homeSectionKeyToLabel(key: HomeSectionKey): string {
  return KEY_TO_LABEL[key];
}
