import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/data/cms';
import { BusinessSettingsForm } from '@/components/forms/cms/BusinessSettingsForm';

export const metadata: Metadata = { title: 'Business Settings' };

const DEFAULT_SETTINGS = {
  companyName: 'Vision Analytical',
  addressLine: null,
  city: null,
  state: null,
  country: 'India',
  phone: null,
  whatsappNumber: null,
  email: null,
  facebookUrl: null,
  instagramUrl: null,
  linkedinUrl: null,
  youtubeUrl: null,
  seoDefaultTitle: null,
  seoDefaultDescription: null,
  logoUrl: null,
  faviconUrl: null,
};

export default async function AdminBusinessSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        These details power contact links, structured data, SEO defaults and the site&rsquo;s logo/favicon across the whole site.
      </p>
      <BusinessSettingsForm settings={settings ?? DEFAULT_SETTINGS} />
    </div>
  );
}
