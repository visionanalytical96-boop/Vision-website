import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAdminHomeSectionByKey } from '@/lib/data/admin-cms';
import { homeSectionSlugToKey, homeSectionKeyToLabel } from '@/lib/cms/routing';
import { heroContentSchema, categoriesContentSchema, cardsContentSchema, ctaContentSchema, parseContent } from '@/lib/cms/schemas';
import {
  DEFAULT_HERO_CONTENT,
  DEFAULT_CATEGORIES_CONTENT,
  DEFAULT_LIFECYCLE_CONTENT,
  DEFAULT_WHY_US_CONTENT,
  DEFAULT_CTA_CONTENT,
} from '@/lib/cms/defaults';
import { HeroSectionForm } from '@/components/forms/cms/HeroSectionForm';
import { CategoriesSectionForm } from '@/components/forms/cms/CategoriesSectionForm';
import { CardsSectionForm } from '@/components/forms/cms/CardsSectionForm';
import { CtaSectionForm } from '@/components/forms/cms/CtaSectionForm';
import { HomeSectionKey } from '@/generated/prisma/enums';

interface PageParams {
  key: string;
}

export async function generateMetadata(props: { params: Promise<PageParams> }): Promise<Metadata> {
  const { key } = await props.params;
  const sectionKey = homeSectionSlugToKey(key);
  return { title: sectionKey ? homeSectionKeyToLabel(sectionKey) : 'Section' };
}

export default async function AdminHomeSectionEditPage(props: { params: Promise<PageParams> }) {
  const { key } = await props.params;
  const sectionKey = homeSectionSlugToKey(key);
  if (!sectionKey) notFound();

  const section = await getAdminHomeSectionByKey(sectionKey);
  if (!section) notFound();

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-semibold text-foreground">{homeSectionKeyToLabel(sectionKey)}</h2>
      {sectionKey === HomeSectionKey.HERO && (
        <HeroSectionForm content={parseContent(heroContentSchema, section.content, DEFAULT_HERO_CONTENT)} />
      )}
      {sectionKey === HomeSectionKey.CATEGORIES && (
        <CategoriesSectionForm content={parseContent(categoriesContentSchema, section.content, DEFAULT_CATEGORIES_CONTENT)} />
      )}
      {sectionKey === HomeSectionKey.LIFECYCLE && (
        <CardsSectionForm
          sectionKey={HomeSectionKey.LIFECYCLE}
          content={parseContent(cardsContentSchema, section.content, DEFAULT_LIFECYCLE_CONTENT)}
          submitLabel="Save Lifecycle Section"
          showLinks
        />
      )}
      {sectionKey === HomeSectionKey.WHY_US && (
        <CardsSectionForm
          sectionKey={HomeSectionKey.WHY_US}
          content={parseContent(cardsContentSchema, section.content, DEFAULT_WHY_US_CONTENT)}
          submitLabel="Save Why Us Section"
        />
      )}
      {sectionKey === HomeSectionKey.CTA && (
        <CtaSectionForm content={parseContent(ctaContentSchema, section.content, DEFAULT_CTA_CONTENT)} />
      )}
    </div>
  );
}
