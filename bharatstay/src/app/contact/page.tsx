import type { Metadata } from 'next';
import { getSettings } from '@/lib/site';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { ContactForm } from '@/components/ContactForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Contact',
  description: 'BharatStay se baat kijiye — booking, listing ya kisi bhi sawaal ke liye.',
};

export default async function ContactPage() {
  const settings = await getSettings();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <p className="eyebrow">Baat kijiye</p>
        <h1 className="display mt-3 text-[clamp(30px,6vw,52px)]">Hum sun rahe hain</h1>
        <p className="mt-3 max-w-[58ch] text-[15px]" style={{ color: 'var(--basalt)' }}>
          Booking mein dikkat, apni property list karani ho, ya koi sujhav ho — likh dijiye. Har message
          padha jaata hai.
        </p>

        <div className="mt-9 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <ContactForm />

          <aside className="card p-6">
            <h2 className="text-[16px] font-semibold">Seedhe bhi pahunch sakte hain</h2>
            <dl className="mt-4 space-y-4 text-[14px]">
              <div>
                <dt className="eyebrow">Email</dt>
                <dd className="mt-1">
                  <a href={`mailto:${settings.supportEmail}`}>{settings.supportEmail}</a>
                </dd>
              </div>
              {settings.supportPhone && (
                <div>
                  <dt className="eyebrow">Phone</dt>
                  <dd className="data mt-1">
                    <a href={`tel:${settings.supportPhone.replace(/\s/g, '')}`}>{settings.supportPhone}</a>
                  </dd>
                </div>
              )}
              <div>
                <dt className="eyebrow">Area</dt>
                <dd className="mt-1" style={{ color: 'var(--basalt)' }}>
                  Badlapur–Karjat belt se poore Maharashtra tak.
                </dd>
              </div>
            </dl>

            <div className="mt-6 rounded-lg px-4 py-3 text-[13px]" style={{ background: 'var(--mist-deep)', color: 'var(--basalt)' }}>
              Apni farmhouse, hotel ya restaurant list karani hai? <a href="/partner/apply">Partner form</a> bhar
              dijiye — login ki zaroorat nahi.
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
