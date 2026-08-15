import type { Metadata } from 'next';
import { getThemeSettings } from '@/lib/data/cms';
import { ThemeSettingsForm } from '@/components/forms/cms/ThemeSettingsForm';

export const metadata: Metadata = { title: 'Theme' };

const DEFAULT_THEME = {
  primaryColor: '#2563eb',
  secondaryColor: '#22d3ee',
  fontHeading: 'syne',
  fontBody: 'space-grotesk',
  buttonStyle: 'rounded',
  animationsEnabled: true,
};

export default async function AdminThemePage() {
  const theme = await getThemeSettings();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Customize the site&rsquo;s colors, fonts, button style and animations.</p>
      <ThemeSettingsForm settings={theme ?? DEFAULT_THEME} />
    </div>
  );
}
