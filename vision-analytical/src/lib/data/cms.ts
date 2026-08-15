import 'server-only';
import { prisma } from '@/lib/db';
import type { ContentPageKey } from '@/generated/prisma/client';
import type { HomeSection, PageContent, SiteSettings, ThemeSettings } from '@/generated/prisma/client';

const SITE_SETTINGS_ID = 'singleton';
const THEME_SETTINGS_ID = 'singleton';

/**
 * These render on every page via the root layout/header/footer, so a
 * database hiccup (including "not reachable yet" during a build) must
 * degrade to defaults rather than take the whole site down with it.
 */
async function safely<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch (error) {
    console.error('CMS data fetch failed, using fallback:', error);
    return fallback;
  }
}

export function getHomeSections(): Promise<HomeSection[]> {
  return safely(() => prisma.homeSection.findMany({ orderBy: { sortOrder: 'asc' } }), []);
}

export function getPageContent(page: ContentPageKey): Promise<PageContent | null> {
  return safely(() => prisma.pageContent.findUnique({ where: { page } }), null);
}

export function getSiteSettings(): Promise<SiteSettings | null> {
  return safely(() => prisma.siteSettings.findUnique({ where: { id: SITE_SETTINGS_ID } }), null);
}

export function getThemeSettings(): Promise<ThemeSettings | null> {
  return safely(() => prisma.themeSettings.findUnique({ where: { id: THEME_SETTINGS_ID } }), null);
}
