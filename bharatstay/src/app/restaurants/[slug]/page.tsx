import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { RestaurantCard } from '@/components/RestaurantCard';
import { Gallery } from '@/components/Gallery';
import { INR, mapDirectionsUrl, mapSearchUrl } from '@/lib/format';
import { LiveMap } from '@/components/LiveMap';
import { getSettings } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const r = await db.restaurant.findUnique({ where: { slug: params.slug }, select: { name: true, city: true, cuisine: true } });
  if (!r) return { title: 'Restaurant not found' };
  return { title: `${r.name}, ${r.city}`, description: `${r.name} — ${r.cuisine}, ${r.city}, Maharashtra.` };
}

export default async function RestaurantDetailPage({ params }: { params: { slug: string } }) {
  const r = await db.restaurant.findUnique({
    where: { slug: params.slug },
    include: { photos: { select: { id: true }, orderBy: { sort: 'asc' } } },
  });
  if (!r || !r.visible) notFound();

  const [nearby, settings] = await Promise.all([
    db.restaurant.findMany({
      where: { visible: true, city: r.city, id: { not: r.id } },
      include: { photos: { select: { id: true }, orderBy: { sort: 'asc' }, take: 1 } },
      take: 3,
    }),
    getSettings(),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-8">
        <nav className="mb-5 text-[13px]" style={{ color: 'var(--basalt-soft)' }}>
          <Link href="/restaurants">Restaurants</Link> ·{' '}
          <Link href={`/restaurants?city=${encodeURIComponent(r.city)}`}>{r.city}</Link>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="chip text-[11.5px]">{r.vegType}</span>
            <h1 className="display mt-3 text-[clamp(28px,5vw,46px)]">
              <span aria-hidden>{r.emoji}</span> {r.name}
            </h1>
            <p className="mt-2 text-[14.5px]" style={{ color: 'var(--basalt)' }}>
              {r.cuisine}
            </p>
          </div>
          <div
            className="data rounded-lg px-3 py-2 text-[15px] font-medium"
            style={{ background: 'color-mix(in srgb, var(--turmeric) 22%, transparent)' }}
          >
            ★ {r.rating.toFixed(1)}
          </div>
        </div>

        <div className="mt-7">
          <Gallery photos={r.photos} tone={r.tone} title={r.name} />
        </div>

        <dl className="card mt-7 divide-y overflow-hidden text-[14.5px]">
          {(
            [
              ['Kharcha', `${INR(r.costForTwo)} for two (approx)`],
              ['Timings', r.hours],
              ['Area', r.area],
              ['Address', r.address],
            ] as [string, string][]
          ).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[110px_1fr] gap-3 px-5 py-3.5">
              <dt style={{ color: 'var(--basalt-soft)' }}>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        {r.lat != null && r.lng != null && (
          <div className="mt-6">
            <LiveMap pins={[{ lat: r.lat, lng: r.lng, label: r.name, kind: 'place' }]} height={280} />
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <a className="btn btn-primary btn-sm" href={mapDirectionsUrl(`${r.name}, ${r.area}`)} target="_blank" rel="noopener noreferrer">
            Directions
          </a>
          <a className="btn btn-secondary btn-sm" href={mapSearchUrl(`${r.name}, ${r.area}`)} target="_blank" rel="noopener noreferrer">
            Google Maps par dekho
          </a>
        </div>

        <p className="mt-5 rounded-lg px-4 py-3 text-[13px]" style={{ background: 'var(--mist-deep)', color: 'var(--basalt)' }}>
          Timings aur kharcha badal sakte hain — jaane se pehle Maps par confirm kar lijiye. Sudhaar batana ho to{' '}
          {settings.supportEmail} par likhiye.
        </p>

        {nearby.length > 0 && (
          <section className="mt-14">
            <h2 className="display text-[clamp(22px,3.5vw,30px)]">{r.city} mein aur bhi</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {nearby.map((n, i) => (
                <RestaurantCard key={n.id} restaurant={n} index={i + 9} />
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
