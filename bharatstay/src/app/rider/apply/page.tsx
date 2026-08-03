import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { RiderApplyForm } from '@/components/RiderApplyForm';

export const metadata: Metadata = {
  title: 'Rider banein',
  description: 'Bike, e-bike ya auto hai? Badlapur–Karjat belt mein ride service ke liye register kijiye.',
};

export default function RiderApplyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-12">
        <p className="eyebrow">Riders ke liye</p>
        <h1 className="display mt-3 text-[clamp(32px,6vw,54px)]">Apni gaadi chalao, kamao</h1>
        <p className="mt-4 max-w-[58ch] text-[15.5px] leading-relaxed" style={{ color: 'var(--basalt)' }}>
          Bike, e-bike ya auto — Badlapur se Karjat tak ki rides ke liye register kijiye. Form bhariye, admin
          verify karega, aur approve hote hi aap apne phone se online jaake rides lena shuru kar sakte hain.
        </p>

        <div className="mt-10">
          <RiderApplyForm />
        </div>

        <div className="card mt-10 p-5 text-[13.5px] leading-relaxed" style={{ color: 'var(--basalt)' }}>
          <strong>Kaam kaise karta hai:</strong> approve hone ke baad usi number se{' '}
          <Link href="/login" style={{ color: 'var(--laterite)', fontWeight: 600 }}>
            login
          </Link>{' '}
          kijiye aur <span className="data">/rider</span> page kholiye. Wahan &ldquo;Online&rdquo; karte hi aapke
          phone ki location se aas-paas ki ride requests aapko milne lagengi.
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
