import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { FloatingContactButtons } from '@/components/layout/FloatingContactButtons';
import { getSiteSettings } from '@/lib/data/cms';

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const settings = await getSiteSettings();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <FloatingContactButtons phone={settings?.phone} whatsappNumber={settings?.whatsappNumber} />
    </>
  );
}
