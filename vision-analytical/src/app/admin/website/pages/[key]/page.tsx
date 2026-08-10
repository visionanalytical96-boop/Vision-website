import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAdminPageContent } from '@/lib/data/admin-cms';
import { pageContentSlugToKey, pageContentKeyToLabel } from '@/lib/cms/routing';
import {
  aboutContentSchema,
  servicesContentSchema,
  contactContentSchema,
  headerContentSchema,
  footerContentSchema,
  parseContent,
} from '@/lib/cms/schemas';
import {
  DEFAULT_ABOUT_CONTENT,
  DEFAULT_SERVICES_CONTENT,
  DEFAULT_CONTACT_CONTENT,
  DEFAULT_HEADER_CONTENT,
  DEFAULT_FOOTER_CONTENT,
} from '@/lib/cms/defaults';
import { AboutPageForm } from '@/components/forms/cms/AboutPageForm';
import { ServicesPageForm } from '@/components/forms/cms/ServicesPageForm';
import { ContactPageForm } from '@/components/forms/cms/ContactPageForm';
import { HeaderContentForm } from '@/components/forms/cms/HeaderContentForm';
import { FooterContentForm } from '@/components/forms/cms/FooterContentForm';
import { ContentPageKey } from '@/generated/prisma/enums';

interface PageParams {
  key: string;
}

export async function generateMetadata(props: { params: Promise<PageParams> }): Promise<Metadata> {
  const { key } = await props.params;
  const pageKey = pageContentSlugToKey(key);
  return { title: pageKey ? pageContentKeyToLabel(pageKey) : 'Page' };
}

export default async function AdminPageContentEditPage(props: { params: Promise<PageParams> }) {
  const { key } = await props.params;
  const pageKey = pageContentSlugToKey(key);
  if (!pageKey) notFound();

  const page = await getAdminPageContent(pageKey);
  if (!page) notFound();

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-semibold text-foreground">{pageContentKeyToLabel(pageKey)}</h2>
      {pageKey === ContentPageKey.ABOUT && (
        <AboutPageForm content={parseContent(aboutContentSchema, page.content, DEFAULT_ABOUT_CONTENT)} />
      )}
      {pageKey === ContentPageKey.SERVICES && (
        <ServicesPageForm content={parseContent(servicesContentSchema, page.content, DEFAULT_SERVICES_CONTENT)} />
      )}
      {pageKey === ContentPageKey.CONTACT && (
        <ContactPageForm content={parseContent(contactContentSchema, page.content, DEFAULT_CONTACT_CONTENT)} />
      )}
      {pageKey === ContentPageKey.HEADER && (
        <HeaderContentForm content={parseContent(headerContentSchema, page.content, DEFAULT_HEADER_CONTENT)} />
      )}
      {pageKey === ContentPageKey.FOOTER && (
        <FooterContentForm content={parseContent(footerContentSchema, page.content, DEFAULT_FOOTER_CONTENT)} />
      )}
    </div>
  );
}
