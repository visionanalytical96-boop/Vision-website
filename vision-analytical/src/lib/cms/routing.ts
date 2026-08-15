import { HomeSectionKey, ContentPageKey } from '@/generated/prisma/enums';

// URL-friendly slugs for each homepage section, used in /admin/website/homepage/[slug].
const KEY_TO_SLUG: Record<HomeSectionKey, string> = {
  HERO: 'hero',
  COMPANY_OVERVIEW: 'company-overview',
  CATEGORIES: 'categories',
  FEATURED_PRODUCTS: 'featured-products',
  BRANDS: 'brands',
  LIFECYCLE: 'lifecycle',
  INDUSTRIES: 'industries',
  WHY_US: 'why-us',
  KNOWLEDGE: 'knowledge',
  TESTIMONIALS: 'testimonials',
  CONTACT_BAND: 'contact-band',
  CTA: 'cta',
};

const SLUG_TO_KEY: Record<string, HomeSectionKey> = Object.fromEntries(
  Object.entries(KEY_TO_SLUG).map(([key, slug]) => [slug, key as HomeSectionKey]),
);

const KEY_TO_LABEL: Record<HomeSectionKey, string> = {
  HERO: 'Hero',
  COMPANY_OVERVIEW: 'Company Overview',
  CATEGORIES: 'Instrument Categories',
  FEATURED_PRODUCTS: 'Featured Products',
  BRANDS: 'Brands Grid',
  LIFECYCLE: 'Instrument Lifecycle',
  INDUSTRIES: 'Industries Served',
  WHY_US: 'Why Us',
  KNOWLEDGE: 'Knowledge Center Preview',
  TESTIMONIALS: 'Testimonials',
  CONTACT_BAND: 'Contact Band',
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

// URL-friendly slugs for each content page, used in /admin/website/pages/[slug].
const PAGE_KEY_TO_SLUG: Record<ContentPageKey, string> = {
  ABOUT: 'about',
  SERVICES: 'services',
  CONTACT: 'contact',
  ANNOUNCEMENT: 'announcement',
  HEADER: 'header',
  FOOTER: 'footer',
};

const PAGE_SLUG_TO_KEY: Record<string, ContentPageKey> = Object.fromEntries(
  Object.entries(PAGE_KEY_TO_SLUG).map(([key, slug]) => [slug, key as ContentPageKey]),
);

const PAGE_KEY_TO_LABEL: Record<ContentPageKey, string> = {
  ABOUT: 'About Page',
  SERVICES: 'Services Page',
  CONTACT: 'Contact Page',
  ANNOUNCEMENT: 'Announcement Bar',
  HEADER: 'Header & Navigation',
  FOOTER: 'Footer',
};

export function pageContentSlugToKey(slug: string): ContentPageKey | null {
  return PAGE_SLUG_TO_KEY[slug] ?? null;
}

export function pageContentKeyToSlug(key: ContentPageKey): string {
  return PAGE_KEY_TO_SLUG[key];
}

export function pageContentKeyToLabel(key: ContentPageKey): string {
  return PAGE_KEY_TO_LABEL[key];
}
