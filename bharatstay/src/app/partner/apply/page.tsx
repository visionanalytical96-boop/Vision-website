import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { PartnerForm } from '@/components/PartnerForm';

export const metadata: Metadata = {
  title: 'List your property',
  description:
    'Farmhouse, villa, homestay, hotel ya restaurant — form bharo, photos daalo, aur approve hone par listing live ho jaayegi.',
};

export default function PartnerApplyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-5 py-12">
        <p className="eyebrow">Owners ke liye</p>
        <h1 className="display mt-3 text-[clamp(32px,6vw,54px)]">Apni jagah list karo</h1>
        <p className="mt-4 max-w-[60ch] text-[15.5px] leading-relaxed" style={{ color: 'var(--basalt)' }}>
          Paanch chhote steps. Login banane ki zaroorat nahi — form bhejne ke baad aapko ek link milega jisse aap
          kabhi bhi apni application ka status dekh sakte hain.
        </p>

        <div className="mt-10">
          <PartnerForm />
        </div>

        <p className="mt-10 text-[13px]" style={{ color: 'var(--basalt-soft)' }}>
          Pehle se application bhej chuke hain?{' '}
          <Link href="/partner/status" className="font-semibold" style={{ color: 'var(--laterite)' }}>
            Status dekhiye
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
