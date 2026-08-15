import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAdminHomeSectionByKey, getSelectableProducts } from '@/lib/data/admin-cms';
import { homeSectionSlugToKey, homeSectionKeyToLabel } from '@/lib/cms/routing';
import {
  heroContentSchema,
  categoriesContentSchema,
  cardsContentSchema,
  ctaContentSchema,
  overviewContentSchema,
  featuredProductsContentSchema,
  listSectionContentSchema,
  industriesContentSchema,
  contactBandContentSchema,
  parseContent,
} from '@/lib/cms/schemas';
import {
  DEFAULT_HERO_CONTENT,
  DEFAULT_CATEGORIES_CONTENT,
  DEFAULT_LIFECYCLE_CONTENT,
  DEFAULT_WHY_US_CONTENT,
  DEFAULT_CTA_CONTENT,
  DEFAULT_COMPANY_OVERVIEW_CONTENT,
  DEFAULT_FEATURED_PRODUCTS_CONTENT,
  DEFAULT_BRANDS_SECTION_CONTENT,
  DEFAULT_INDUSTRIES_CONTENT,
  DEFAULT_KNOWLEDGE_CONTENT,
  DEFAULT_TESTIMONIALS_CONTENT,
  DEFAULT_CONTACT_BAND_CONTENT,
} from '@/lib/cms/defaults';
import { HeroSectionForm } from '@/components/forms/cms/HeroSectionForm';
import { CategoriesSectionForm } from '@/components/forms/cms/CategoriesSectionForm';
import { CardsSectionForm } from '@/components/forms/cms/CardsSectionForm';
import { CtaSectionForm } from '@/components/forms/cms/CtaSectionForm';
import { CompanyOverviewForm } from '@/components/forms/cms/CompanyOverviewForm';
import { FeaturedProductsForm } from '@/components/forms/cms/FeaturedProductsForm';
import { ListSectionForm } from '@/components/forms/cms/ListSectionForm';
import { IndustriesSectionForm } from '@/components/forms/cms/IndustriesSectionForm';
import { ContactBandForm } from '@/components/forms/cms/ContactBandForm';
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
      {sectionKey === HomeSectionKey.COMPANY_OVERVIEW && (
        <CompanyOverviewForm content={parseContent(overviewContentSchema, section.content, DEFAULT_COMPANY_OVERVIEW_CONTENT)} />
      )}
      {sectionKey === HomeSectionKey.FEATURED_PRODUCTS && (
        <FeaturedProductsForm
          content={parseContent(featuredProductsContentSchema, section.content, DEFAULT_FEATURED_PRODUCTS_CONTENT)}
          products={await getSelectableProducts()}
        />
      )}
      {sectionKey === HomeSectionKey.BRANDS && (
        <ListSectionForm
          sectionKey={HomeSectionKey.BRANDS}
          content={parseContent(listSectionContentSchema, section.content, DEFAULT_BRANDS_SECTION_CONTENT)}
          submitLabel="Save Brands Section"
          note="The logos themselves come from your published brands - manage them under Products › Brands."
        />
      )}
      {sectionKey === HomeSectionKey.INDUSTRIES && (
        <IndustriesSectionForm content={parseContent(industriesContentSchema, section.content, DEFAULT_INDUSTRIES_CONTENT)} />
      )}
      {sectionKey === HomeSectionKey.KNOWLEDGE && (
        <ListSectionForm
          sectionKey={HomeSectionKey.KNOWLEDGE}
          content={parseContent(listSectionContentSchema, section.content, DEFAULT_KNOWLEDGE_CONTENT)}
          submitLabel="Save Knowledge Section"
          note="The three most recently published Knowledge Center articles appear here automatically."
        />
      )}
      {sectionKey === HomeSectionKey.TESTIMONIALS && (
        <ListSectionForm
          sectionKey={HomeSectionKey.TESTIMONIALS}
          content={parseContent(listSectionContentSchema, section.content, DEFAULT_TESTIMONIALS_CONTENT)}
          submitLabel="Save Testimonials Section"
          note="Add the testimonials themselves under Website › Testimonials. The section stays hidden until at least one is published."
        />
      )}
      {sectionKey === HomeSectionKey.CONTACT_BAND && (
        <ContactBandForm content={parseContent(contactBandContentSchema, section.content, DEFAULT_CONTACT_BAND_CONTENT)} />
      )}
    </div>
  );
}
