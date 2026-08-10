import 'server-only';
import { prisma } from '@/lib/db';
import type { ContentPageKey } from '@/generated/prisma/client';

const SITE_SETTINGS_ID = 'singleton';
const THEME_SETTINGS_ID = 'singleton';

export function getHomeSections() {
  return prisma.homeSection.findMany({ orderBy: { sortOrder: 'asc' } });
}

export function getPageContent(page: ContentPageKey) {
  return prisma.pageContent.findUnique({ where: { page } });
}

export function getSiteSettings() {
  return prisma.siteSettings.findUnique({ where: { id: SITE_SETTINGS_ID } });
}

export function getThemeSettings() {
  return prisma.themeSettings.findUnique({ where: { id: THEME_SETTINGS_ID } });
}
