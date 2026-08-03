import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getEnabledServices } from '@/lib/site';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { RestaurantCard } from '@/components/RestaurantCard';
import { SearchBar } from '@/components/SearchBar';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Restaurants',
  description: 'Maharashtra ke restaurants, dhabe aur cafes — misal se Malvani thali tak, address aur timings ke saath.',
};

const VEG = ['Pure Veg', 'Veg & Non-veg', 'Non-veg Special', 'Seafood Special'];

export default async function RestaurantsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ city?: string; veg?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const enabled = await getEnabledServices();
  if (!enabled.has('restaurants')) notFound();

  const { city, veg } = searchParams;
  const where = {
    visible: true,
    ...(city ? { city: { equals: city, mode: 'insensitive' as const } } : {}),
    ...(veg ? { vegType: veg } : {}),
  };

  const [rows, cities] = await Promise.all([
    db.restaurant.findMany({
      where,
      orderBy: [{ rating: 'desc' }, { name: 'asc' }],
      take: 120,
      include: { photos: { select: { id: true }, orderBy: { sort: 'asc' }, take: 1 } },
    }),
    db.restaurant.findMany({ where: { visible: true }, select: { city: true }, distinct: ['city'], orderBy: { city: 'asc' } }),
  ]);

  const q = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ city, veg, ...patch })) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/restaurants?${s}` : '/restaurants';
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <p className="eyebrow">Jevan</p>
        <h1 className="display mt-3 text-[clamp(30px,6vw,52px)]">{city ? `${city} mein khana` : 'Restaurants'}</h1>
        <p className="mt-3 text-[15px]" style={{ color: 'var(--basalt)' }}>
          {rows.length} jagahein — har ek ka area, timings aur Maps link.
        </p>

        <div className="mt-7 max-w-2xl">
          <SearchBar />
        </div>

        <div className="mt-7 space-y-4">
          <div className="scroll-x">
            <div className="flex gap-2">
              <Link href={q({ veg: undefined })} className={`chip whitespace-nowrap ${!veg ? 'chip-on' : ''}`}>
                Sab
              </Link>
              {VEG.map((v) => (
                <Link key={v} href={q({ veg: v })} className={`chip whitespace-nowrap ${veg === v ? 'chip-on' : ''}`}>
                  {v}
                </Link>
              ))}
            </div>
          </div>
          <div className="scroll-x">
            <div className="flex gap-2">
              <Link href={q({ city: undefined })} className={`chip whitespace-nowrap ${!city ? 'chip-on' : ''}`}>
                Sab sheher
              </Link>
              {cities.map((c) => (
                <Link key={c.city} href={q({ city: c.city })} className={`chip whitespace-nowrap ${city === c.city ? 'chip-on' : ''}`}>
                  {c.city}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="card mt-10 p-10 text-center">
            <p className="text-[16px] font-medium">Yahan abhi koi restaurant nahi</p>
            <Link href="/restaurants" className="btn btn-secondary mt-6">
              Filters hatao
            </Link>
          </div>
        ) : (
          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r, i) => (
              <RestaurantCard key={r.id} restaurant={r} index={i} />
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
