import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getEnabledServices } from '@/lib/site';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { INR, mapSearchUrl } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Map',
  description: 'Maharashtra ke stays aur restaurants naksha par — har pin se Google Maps par jump karo.',
};

// Maharashtra's rough bounding box, used to project lat/lng onto the drawing.
const BOUNDS = { minLat: 15.6, maxLat: 22.1, minLng: 72.6, maxLng: 80.9 };
const W = 1000;
const H = 760;

const project = (lat: number, lng: number) => ({
  x: ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * W,
  // SVG y grows downward, so north has to be flipped.
  y: H - ((lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * H,
});

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
    .map(([city, c]) => ({ city, ...c, ...project(c.lat, c.lng) }))
    .sort((a, b) => b.stays + b.rests - (a.stays + a.rests));

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
          <div className="scroll-x">
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: '620px', height: 'auto' }} role="img" aria-label="Maharashtra ka naksha">
              <rect width={W} height={H} fill="var(--mist-deep)" rx="12" />

              {/* latitude/longitude guides — orientation, not decoration */}
              {[16, 17, 18, 19, 20, 21, 22].map((lat) => {
                const { y } = project(lat, BOUNDS.minLng);
                return (
                  <g key={lat}>
                    <line x1="0" y1={y} x2={W} y2={y} stroke="var(--line)" strokeWidth="1" opacity="0.5" />
                    <text x="6" y={y - 5} fontSize="11" fill="var(--basalt-soft)" fontFamily="var(--font-data)">
                      {lat}°N
                    </text>
                  </g>
                );
              })}
              {[73, 75, 77, 79].map((lng) => {
                const { x } = project(BOUNDS.minLat, lng);
                return (
                  <g key={lng}>
                    <line x1={x} y1="0" x2={x} y2={H} stroke="var(--line)" strokeWidth="1" opacity="0.5" />
                    <text x={x + 5} y={H - 8} fontSize="11" fill="var(--basalt-soft)" fontFamily="var(--font-data)">
                      {lng}°E
                    </text>
                  </g>
                );
              })}

              {pins.map((p) => {
                const total = p.stays + p.rests;
                const r = Math.min(22, 7 + Math.sqrt(total) * 2.6);
                return (
                  <a key={p.city} href={`/stays?city=${encodeURIComponent(p.city)}`}>
                    <circle cx={p.x} cy={p.y} r={r} fill="var(--laterite)" opacity="0.28" />
                    <circle cx={p.x} cy={p.y} r={4.5} fill="var(--laterite)" />
                    <text
                      x={p.x + r + 5}
                      y={p.y + 4}
                      fontSize="13"
                      fill="var(--ink)"
                      fontWeight="600"
                      fontFamily="var(--font-body)"
                    >
                      {p.city}
                    </text>
                  </a>
                );
              })}
            </svg>
          </div>
          <p className="mt-3 text-[12.5px]" style={{ color: 'var(--basalt-soft)' }}>
            Yeh apna banaya hua naksha hai — asli satellite view ke liye har listing par &ldquo;Google Maps par
            dekho&rdquo; button hai.
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
