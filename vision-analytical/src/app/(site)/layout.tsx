import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { FloatingContactButtons } from '@/components/layout/FloatingContactButtons';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { getSiteSettings, getPageContent } from '@/lib/data/cms';
import { announcementContentSchema, parseContent } from '@/lib/cms/schemas';
import { DEFAULT_ANNOUNCEMENT_CONTENT } from '@/lib/cms/defaults';
import { ContentPageKey } from '@/generated/prisma/enums';

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [settings, announcementPage] = await Promise.all([
    getSiteSettings(),
    getPageContent(ContentPageKey.ANNOUNCEMENT),
  ]);
  const announcement = parseContent(announcementContentSchema, announcementPage?.content, DEFAULT_ANNOUNCEMENT_CONTENT);

  return (
    <>
      {announcement.isEnabled && announcement.message ? (
        <AnnouncementBar
          message={announcement.message}
          linkLabel={announcement.linkLabel}
          linkHref={announcement.linkHref}
        />
      ) : null}
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <FloatingContactButtons phone={settings?.phone} whatsappNumber={settings?.whatsappNumber} />
    </>
  );
}
