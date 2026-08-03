import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getEnabledServices } from '@/lib/site';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { INR, mapSearchUrl } from '@/lib/format';
import { LiveMap, type MapPin } from '@/components/LiveMap';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Map',
  description: 'Maharashtra ke stays aur restaurants asli naksha par — har sheher ka pin click karke listings dekhiye.',
};

export default async function MapPage() {
  const enabled = await getEnabledServices();
  if (!enabled.has('map')) notFound();

  const [stays, restaurants] = await Promise.all([
    db.stay.findMany({
      where: { visible: true, lat: { not: null }, lng: { not: null } },
      select: { id: true, slug: true, name: true, city: true, price: true, lat: true, lng: true },
      take: 300,
    }),
    enabled.has('restaurants')
      ? db.restaurant.findMany({
          where: { visible: true, lat: { not: null }, lng: { not: null } },
          select: { id: true, slug: true, name: true, city: true, lat: true, lng: true },
          take: 300,
        })
      : Promise.resolve([]),
  ]);

  // One pin per city keeps the drawing readable; the list below carries detail.
  const cities = new Map<string, { lat: number; lng: number; stays: number; rests: number }>();
  for (const s of stays) {
    const c = cities.get(s.city) ?? { lat: s.lat!, lng: s.lng!, stays: 0, rests: 0 };
    c.stays++;
    cities.set(s.city, c);
  }
  for (const r of restaurants) {
    const c = cities.get(r.city) ?? { lat: r.lat!, lng: r.lng!, stays: 0, rests: 0 };
    c.rests++;
    cities.set(r.city, c);
  }

  const pins = [...cities.entries()]
    .map(([city, c]) => ({ city, ...c }))
    .sort((a, b) => b.stays + b.rests - (a.stays + a.rests));

  const mapPins: MapPin[] = pins.map((p) => ({
    lat: p.lat,
    lng: p.lng,
    kind: 'place',
    weight: p.stays + p.rests,
    label: `${p.city} — ${p.stays} stays${p.rests ? `, ${p.rests} restaurants` : ''}`,
    href: `/stays?city=${encodeURIComponent(p.city)}`,
  }));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <p className="eyebrow">Naksha</p>
        <h1 className="display mt-3 text-[clamp(30px,6vw,52px)]">Sab kahan hai</h1>
        <p className="mt-3 max-w-[58ch] text-[15px]" style={{ color: 'var(--basalt)' }}>
          {pins.length} sheher, {stays.length} stays aur {restaurants.length} restaurants. Pin par click karke us
          sheher ke stays dekhiye.
        </p>

        <div className="card mt-8 overflow-hidden p-4">
          <LiveMap pins={mapPins} height={560} />
          <p className="mt-3 text-[12.5px]" style={{ color: 'var(--basalt-soft)' }}>
            Asli naksha OpenStreetMap se — bada pin matlab us sheher mein zyada listings. Pin par click karke us
            sheher ke stays kholiye.
          </p>
        </div>

        <section className="mt-12">
          <h2 className="display text-[clamp(21px,3.5vw,28px)]">Sheher ke hisaab se</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pins.map((p) => (
              <div key={p.city} className="card flex items-center justify-between gap-3 p-4">
                <div>
                  <Link href={`/stays?city=${encodeURIComponent(p.city)}`} className="text-[15px] font-semibold">
                    {p.city}
                  </Link>
                  <p className="data mt-0.5 text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
                    {p.stays} stays · {p.rests} restaurants
                  </p>
                </div>
                <a
                  className="btn btn-secondary btn-sm shrink-0"
                  href={mapSearchUrl(p.city)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Maps
                </a>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
