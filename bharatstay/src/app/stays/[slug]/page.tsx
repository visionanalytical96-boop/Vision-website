import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { StayCard } from '@/components/StayCard';
import { Gallery } from '@/components/Gallery';
import { INR, mapDirectionsUrl, mapSearchUrl, stayTypeLabel } from '@/lib/format';
import { getSettings } from '@/lib/site';
import { BookingBox } from '@/components/BookingBox';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const stay = await db.stay.findUnique({ where: { slug: params.slug }, select: { name: true, city: true, area: true } });
  if (!stay) return { title: 'Stay not found' };
  return {
    title: `${stay.name}, ${stay.city}`,
    description: `${stay.name} — ${stay.area}, ${stay.city}, Maharashtra.`,
  };
}

export default async function StayDetailPage({ params }: { params: { slug: string } }) {
  const stay = await db.stay.findUnique({
    where: { slug: params.slug },
    include: { photos: { select: { id: true }, orderBy: { sort: 'asc' } } },
  });
  if (!stay || !stay.visible) notFound();

  const [nearby, settings] = await Promise.all([
    db.stay.findMany({
      where: { visible: true, city: stay.city, id: { not: stay.id } },
      include: { photos: { select: { id: true }, orderBy: { sort: 'asc' }, take: 1 } },
      take: 3,
    }),
    getSettings(),
  ]);

  const off = stay.basePrice > stay.price ? Math.round((1 - stay.price / stay.basePrice) * 100) : 0;
  const tax = Math.round((stay.price * stay.taxPct) / 100);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <nav className="mb-5 text-[13px]" style={{ color: 'var(--basalt-soft)' }}>
          <Link href="/stays">Stays</Link> ·{' '}
          <Link href={`/stays?city=${encodeURIComponent(stay.city)}`}>{stay.city}</Link>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip text-[11.5px]">{stayTypeLabel(stay.type)}</span>
              <span className="chip text-[11.5px]">{'★'.repeat(stay.star)}</span>
            </div>
            <h1 className="display mt-3 text-[clamp(28px,5vw,48px)]">{stay.name}</h1>
            <p className="mt-2 text-[14.5px]" style={{ color: 'var(--basalt)' }}>
              {stay.address}
            </p>
          </div>
          <div
            className="data rounded-lg px-3 py-2 text-[15px] font-medium"
            style={{ background: 'color-mix(in srgb, var(--turmeric) 22%, transparent)' }}
          >
            ★ {stay.rating.toFixed(1)}{' '}
            <span className="text-[12px]" style={{ color: 'var(--basalt)' }}>
              ({stay.reviewCount})
            </span>
          </div>
        </div>

        <div className="mt-7">
          <Gallery photos={stay.photos} tone={stay.tone} title={stay.name} />
        </div>
        {stay.photos.length === 0 && (
          <p className="mt-2 text-[12.5px]" style={{ color: 'var(--basalt-soft)' }}>
            Is property ki asli photos abhi nahi aayi — upar illustration dikhaya hai.
          </p>
        )}

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-start">
          <div>
            <section>
              <h2 className="text-[19px] font-semibold">Room aur khana</h2>
              <dl className="card mt-3 divide-y overflow-hidden text-[14px]">
                {(
                  [
                    ['Room', stay.room],
                    ['Khana', stay.meal],
                    ['Type', stayTypeLabel(stay.type)],
                    ['Area', stay.area],
                  ] as [string, string][]
                ).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[100px_1fr] gap-3 px-5 py-3">
                    <dt style={{ color: 'var(--basalt-soft)' }}>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {stay.amenities.length > 0 && (
              <section className="mt-8">
                <h2 className="text-[19px] font-semibold">Suvidha</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {stay.amenities.map((a) => (
                    <span key={a} className="chip">
                      {a}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-8">
              <h2 className="text-[19px] font-semibold">Policies</h2>
              <ul className="mt-3 space-y-2 text-[14px]" style={{ color: 'var(--basalt)' }}>
                <li>{stay.freeCancel ? '✓ Free cancellation — check-in se 24 ghante pehle tak' : '· Cancellation par charges lag sakte hain'}</li>
                <li>{stay.payAtHotel ? '✓ Property par pay kar sakte hain' : '· Booking ke waqt payment'}</li>
                <li>{stay.couple ? '✓ Couples welcome' : '· Couples ke liye ID zaroori'}</li>
                <li>{stay.family ? '✓ Family friendly' : ''}</li>
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="text-[19px] font-semibold">Kaise pahunche</h2>
              <p className="mt-2 text-[14px]" style={{ color: 'var(--basalt)' }}>
                {stay.address}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a className="btn btn-secondary btn-sm" href={mapSearchUrl(`${stay.name}, ${stay.area}`)} target="_blank" rel="noopener noreferrer">
                  Google Maps par dekho
                </a>
                <a className="btn btn-secondary btn-sm" href={mapDirectionsUrl(`${stay.name}, ${stay.area}`)} target="_blank" rel="noopener noreferrer">
                  Directions
                </a>
              </div>
              <p className="mt-3 text-[12.5px]" style={{ color: 'var(--basalt-soft)' }}>
                Contact ke liye {settings.supportEmail} par likhiye — hum property se connect kara denge.
              </p>
            </section>
          </div>

          <BookingBox
            staySlug={stay.slug}
            stayName={stay.name}
            price={stay.price}
            basePrice={stay.basePrice}
            off={off}
            tax={tax}
            taxPct={stay.taxPct}
          />
        </div>

        {nearby.length > 0 && (
          <section className="mt-16">
            <h2 className="display text-[clamp(22px,3.5vw,30px)]">{stay.city} mein aur bhi</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {nearby.map((s, i) => (
                <StayCard key={s.id} stay={s} index={i + 11} />
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
