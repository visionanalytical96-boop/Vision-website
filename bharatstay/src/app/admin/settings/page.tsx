import { getSettings } from '@/lib/site';
import { SettingsForm } from '@/components/admin/SettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div className="max-w-3xl">
      <h1 className="display text-[clamp(26px,4vw,38px)]">Site settings</h1>
      <p className="mt-2 text-[14px]" style={{ color: 'var(--basalt)' }}>
        Site par likha hua text yahan se badlo — brand ka naam, home page ki lines, contact aur GST. Save karte hi
        badal jayega, redeploy ki zaroorat nahi.
      </p>

      <SettingsForm settings={settings} />
    </div>
  );
}
