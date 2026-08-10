'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/dal';
import {
  heroContentSchema,
  categoriesContentSchema,
  cardsContentSchema,
  ctaContentSchema,
  aboutContentSchema,
  servicesContentSchema,
  contactContentSchema,
  headerContentSchema,
  footerContentSchema,
} from '@/lib/cms/schemas';
import { homeSectionKeyToSlug, pageContentKeyToSlug } from '@/lib/cms/routing';
import { saveUploadedImage } from '@/lib/upload-image';
import { Role, HomeSectionKey, ContentPageKey } from '@/generated/prisma/client';

export interface CmsFormState {
  formError?: string;
  success?: boolean;
}

const HOME_SECTION_SCHEMAS = {
  [HomeSectionKey.HERO]: heroContentSchema,
  [HomeSectionKey.CATEGORIES]: categoriesContentSchema,
  [HomeSectionKey.LIFECYCLE]: cardsContentSchema,
  [HomeSectionKey.WHY_US]: cardsContentSchema,
  [HomeSectionKey.CTA]: ctaContentSchema,
} as const;

export async function updateHomeSection(
  key: HomeSectionKey,
  _prevState: CmsFormState | undefined,
  formData: FormData,
): Promise<CmsFormState> {
  await requireRole(Role.ADMIN);

  let rawContent: unknown;
  try {
    rawContent = JSON.parse(String(formData.get('contentJson') ?? '{}'));
  } catch {
    return { formError: 'Something went wrong reading the form. Please refresh and try again.' };
  }

  if (key === HomeSectionKey.HERO) {
    const imageFile = formData.get('image');
    const upload = await saveUploadedImage(imageFile instanceof File ? imageFile : null, 'site');
    if (upload.error) {
      return { formError: upload.error };
    }
    if (upload.url && typeof rawContent === 'object' && rawContent !== null) {
      rawContent = { ...rawContent, backgroundImage: upload.url };
    }
  }

  const schema = HOME_SECTION_SCHEMAS[key];
  const validated = schema.safeParse(rawContent);
  if (!validated.success) {
    return { formError: `Some fields are invalid: ${validated.error.issues.map((issue) => issue.message).join(', ')}` };
  }

  await prisma.homeSection.update({ where: { key }, data: { content: validated.data } });

  revalidatePath('/');
  revalidatePath(`/admin/website/homepage/${homeSectionKeyToSlug(key)}`);
  return { success: true };
}

export async function toggleHomeSectionVisibility(key: HomeSectionKey): Promise<void> {
  await requireRole(Role.ADMIN);

  const section = await prisma.homeSection.findUnique({ where: { key }, select: { isVisible: true } });
  if (!section) return;

  await prisma.homeSection.update({ where: { key }, data: { isVisible: !section.isVisible } });
  revalidatePath('/');
  revalidatePath('/admin/website/homepage');
}

export async function reorderHomeSections(orderedKeys: HomeSectionKey[]): Promise<void> {
  await requireRole(Role.ADMIN);

  await prisma.$transaction(
    orderedKeys.map((key, index) => prisma.homeSection.update({ where: { key }, data: { sortOrder: index } })),
  );

  revalidatePath('/');
  revalidatePath('/admin/website/homepage');
}

const PAGE_CONTENT_SCHEMAS = {
  [ContentPageKey.ABOUT]: aboutContentSchema,
  [ContentPageKey.SERVICES]: servicesContentSchema,
  [ContentPageKey.CONTACT]: contactContentSchema,
  [ContentPageKey.HEADER]: headerContentSchema,
  [ContentPageKey.FOOTER]: footerContentSchema,
} as const;

export async function updatePageContent(
  page: ContentPageKey,
  _prevState: CmsFormState | undefined,
  formData: FormData,
): Promise<CmsFormState> {
  await requireRole(Role.ADMIN);

  let rawContent: unknown;
  try {
    rawContent = JSON.parse(String(formData.get('contentJson') ?? '{}'));
  } catch {
    return { formError: 'Something went wrong reading the form. Please refresh and try again.' };
  }

  const schema = PAGE_CONTENT_SCHEMAS[page];
  const validated = schema.safeParse(rawContent);
  if (!validated.success) {
    return { formError: `Some fields are invalid: ${validated.error.issues.map((issue) => issue.message).join(', ')}` };
  }

  await prisma.pageContent.upsert({
    where: { page },
    create: { page, content: validated.data },
    update: { content: validated.data },
  });

  // Header/Footer render on every page via the site layout, so revalidate the whole tree.
  revalidatePath('/', 'layout');
  revalidatePath(`/admin/website/pages/${pageContentKeyToSlug(page)}`);
  return { success: true };
}
