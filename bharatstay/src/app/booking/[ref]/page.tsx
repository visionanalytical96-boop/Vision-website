import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { getSettings } from '@/lib/site';
import { INR, mapDirectionsUrl } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Booking voucher', robots: { index: false } };

export default async function VoucherPage({ params }: { params: { ref: string } }) {
  const [booking, settings] = await Promise.all([
    db.booking.findUnique({ where: { ref: params.ref }, include: { stay: true } }),
    getSettings(),
  ]);
  if (!booking) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-12">
        <div
          className="rounded-xl px-5 py-4 text-[14.5px]"
          style={{ background: 'color-mix(in srgb, var(--monsoon) 16%, transparent)' }}
        >
          <strong>Booking confirm ho gayi.</strong> Yeh page aapka voucher hai — screenshot le lijiye ya link save
          kar lijiye.
        </div>

        <div className="card mt-7 overflow-hidden">
          <div className="border-b p-6" style={{ background: 'var(--ink)', color: 'var(--mist)' }}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="eyebrow" style={{ color: 'color-mix(in srgb, var(--mist) 55%, transparent)' }}>
                  Booking reference
                </div>
                <div className="data mt-1 text-[22px] font-medium">{booking.ref}</div>
              </div>
              <span className="chip text-[11.5px]" style={{ background: 'var(--turmeric)', borderColor: 'var(--turmeric)', color: '#10261f' }}>
                {booking.status}
              </span>
            </div>
          </div>

          <div className="p-6">
            <h1 className="display text-[clamp(22px,4vw,32px)]">{booking.stay?.name ?? 'Stay'}</h1>
            {booking.stay && (
              <p className="mt-1 text-[14px]" style={{ color: 'var(--basalt)' }}>
                {booking.stay.address}
              </p>
            )}

            <dl className="mt-6 divide-y text-[14px]">
              {(
                [
                  ['Check-in', booking.checkIn?.toLocaleDateString('en-IN') ?? '—'],
                  ['Check-out', booking.checkOut?.toLocaleDateString('en-IN') ?? '—'],
                  ['Nights', String(booking.nights)],
                  ['Guests', `${booking.guests} guests · ${booking.rooms} rooms`],
                  ['Guest', booking.guestName],
                  ['Contact', `${booking.guestPhone} · ${booking.guestEmail}`],
                  ...(booking.gstin ? ([['GSTIN', `${booking.gstin} · ${booking.gstCompany ?? ''}`]] as [string, string][]) : []),
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="grid grid-cols-[110px_1fr] gap-3 py-3">
                  <dt style={{ color: 'var(--basalt-soft)' }}>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>

            <dl className="mt-6 space-y-2 border-t pt-5 text-[14px]">
              <div className="flex justify-between">
                <dt style={{ color: 'var(--basalt)' }}>Room charges</dt>
                <dd className="data">{INR(booking.baseAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: 'var(--basalt)' }}>Taxes & fees</dt>
                <dd className="data">{INR(booking.taxAmount)}</dd>
              </div>
              <div className="flex justify-between border-t pt-3 text-[18px] font-semibold">
                <dt>Total</dt>
                <dd className="data">{INR(booking.totalAmount)}</dd>
              </div>
            </dl>

            {booking.stay && (
              <a
                className="btn btn-primary mt-6"
                href={mapDirectionsUrl(`${booking.stay.name}, ${booking.stay.area}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Directions kholo
              </a>
            )}

            <p className="mt-6 text-[12.5px]" style={{ color: 'var(--basalt-soft)' }}>
              Kuch badalna ho to {settings.supportEmail} par is reference ke saath likhiye.
            </p>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <Link href="/dashboard" className="btn btn-secondary">
            Meri bookings
          </Link>
          <Link href="/stays" className="btn btn-secondary">
            Aur stays dekho
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
