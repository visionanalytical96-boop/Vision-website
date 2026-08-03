import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import { getEnabledServices } from '@/lib/site';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { SearchBar } from '@/components/SearchBar';
import { StayCard } from '@/components/StayCard';
import { RestaurantCard } from '@/components/RestaurantCard';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Search', robots: { index: false } };

export default async function SearchPage({ searchParams: searchParamsPromise }: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await searchParamsPromise;
  const q = (searchParams.q ?? '').trim();
  const enabled = await getEnabledServices();

  const like = { contains: q, mode: 'insensitive' as const };
  const [stays, restaurants] = q
    ? await Promise.all([
        db.stay.findMany({
          where: {
            visible: true,
            OR: [{ name: like }, { city: like }, { area: like }, { room: like }, { meal: like }],
          },
          include: { photos: { select: { id: true }, orderBy: { sort: 'asc' }, take: 1 } },
          orderBy: { rating: 'desc' },
          take: 24,
        }),
        enabled.has('restaurants')
          ? db.restaurant.findMany({
              where: { visible: true, OR: [{ name: like }, { city: like }, { area: like }, { cuisine: like }] },
              include: { photos: { select: { id: true }, orderBy: { sort: 'asc' }, take: 1 } },
              orderBy: { rating: 'desc' },
              take: 24,
            })
          : Promise.resolve([]),
      ])
    : [[], []];

  const total = stays.length + restaurants.length;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <h1 className="display text-[clamp(28px,5vw,44px)]">{q ? `“${q}”` : 'Kya dhoond rahe hain?'}</h1>
        <p className="mt-3 text-[15px]" style={{ color: 'var(--basalt)' }}>
          {q ? `${total} results mile.` : 'Jagah ka naam, sheher ya khana likhiye.'}
        </p>

        <div className="mt-6 max-w-2xl">
          <SearchBar defaultValue={q} autoFocus={!q} />
        </div>

        {q && total === 0 && (
          <div className="card mt-10 p-10 text-center">
            <p className="text-[16px] font-medium">Kuch nahi mila</p>
            <p className="mt-2 text-[14px]" style={{ color: 'var(--basalt-soft)' }}>
              Sheher ka naam try kijiye — jaise Badlapur, Karjat, Lonavala, Nashik ya Shirdi.
            </p>
            <Link href="/stays" className="btn btn-primary mt-6">
              Saare stays dekho
            </Link>
          </div>
        )}

        {stays.length > 0 && (
          <section className="mt-12">
            <h2 className="display text-[clamp(21px,3.5vw,28px)]">Rehne ki jagahein ({stays.length})</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {stays.map((s, i) => (
                <StayCard key={s.id} stay={s} index={i} />
              ))}
            </div>
          </section>
        )}

        {restaurants.length > 0 && (
          <section className="mt-14">
            <h2 className="display text-[clamp(21px,3.5vw,28px)]">Khane ki jagahein ({restaurants.length})</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {restaurants.map((r, i) => (
                <RestaurantCard key={r.id} restaurant={r} index={i + 4} />
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
