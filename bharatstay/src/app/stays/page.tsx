import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import { getSavedStayIds } from '@/lib/wishlist';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { StayCard } from '@/components/StayCard';
import { SearchBar } from '@/components/SearchBar';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Stays',
  description: 'Maharashtra ke farmhouse, villa, homestay, resort aur hotel — Badlapur–Karjat belt se Konkan tak.',
};

const TYPES = [
  ['', 'Sab'],
  ['FARM_STAY', 'Farmhouse'],
  ['VILLA', 'Villa'],
  ['HOMESTAY', 'Homestay'],
  ['RESORT', 'Resort'],
  ['HOTEL', 'Hotel'],
] as const;

const SORTS = [
  ['price', 'Sasta pehle'],
  ['-price', 'Mehnga pehle'],
  ['rating', 'Rating'],
] as const;

export default async function StaysPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ city?: string; type?: string; sort?: string; max?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const { city, type, sort = 'price', max } = searchParams;
  const maxPrice = max ? Number(max) : undefined;

  const where = {
    visible: true,
    ...(city ? { city: { equals: city, mode: 'insensitive' as const } } : {}),
    ...(type ? { type: type as 'HOTEL' | 'RESORT' | 'VILLA' | 'HOMESTAY' | 'FARM_STAY' } : {}),
    ...(maxPrice && Number.isFinite(maxPrice) ? { price: { lte: maxPrice } } : {}),
  };

  const orderBy =
    sort === 'rating' ? ({ rating: 'desc' } as const) : sort === '-price' ? ({ price: 'desc' } as const) : ({ price: 'asc' } as const);

  const [stays, cities] = await Promise.all([
    db.stay.findMany({
      where,
      orderBy,
      take: 120,
      include: { photos: { select: { id: true }, orderBy: { sort: 'asc' }, take: 1 } },
    }),
    db.stay.findMany({ where: { visible: true }, select: { city: true }, distinct: ['city'], orderBy: { city: 'asc' } }),
  ]);

  const q = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { city, type, sort, max, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/stays?${s}` : '/stays';
  };

  const saved = await getSavedStayIds();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <p className="eyebrow">{city ? `${city} mein` : 'Poora Maharashtra'}</p>
        <h1 className="display mt-3 text-[clamp(30px,6vw,52px)]">
          {city ? `${city} ke stays` : 'Rehne ki jagahein'}
        </h1>
        <p className="mt-3 text-[15px]" style={{ color: 'var(--basalt)' }}>
          {stays.length} {stays.length === 1 ? 'jagah' : 'jagahein'} mili.
        </p>

        <div className="mt-7 max-w-2xl">
          <SearchBar />
        </div>

        <div className="mt-7 space-y-4">
          <div className="scroll-x">
            <div className="flex gap-2">
              {TYPES.map(([value, label]) => (
                <Link key={label} href={q({ type: value || undefined })} className={`chip whitespace-nowrap ${(type ?? '') === value ? 'chip-on' : ''}`}>
                  {label}
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

          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow">Sort</span>
            {SORTS.map(([value, label]) => (
              <Link key={value} href={q({ sort: value })} className={`chip ${sort === value ? 'chip-on' : ''}`}>
                {label}
              </Link>
            ))}
          </div>
        </div>

        {stays.length === 0 ? (
          <div className="card mt-10 p-10 text-center">
            <p className="text-[16px] font-medium">Is filter par kuch nahi mila</p>
            <p className="mt-2 text-[14px]" style={{ color: 'var(--basalt-soft)' }}>
              Sheher ya type badal ke dekhiye.
            </p>
            <Link href="/stays" className="btn btn-secondary mt-6">
              Filters hatao
            </Link>
          </div>
        ) : (
          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {stays.map((s, i) => (
              <StayCard key={s.id} stay={s} index={i} saved={saved.has(s.id)} />
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
