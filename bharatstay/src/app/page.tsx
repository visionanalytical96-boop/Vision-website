import Link from 'next/link';
import { db } from '@/lib/db';
import { getEnabledServices, getSettings } from '@/lib/site';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { SearchBar } from '@/components/SearchBar';
import { StayCard } from '@/components/StayCard';
import { RestaurantCard } from '@/components/RestaurantCard';
import { Scene } from '@/components/Scene';
import { INR } from '@/lib/format';

export const dynamic = 'force-dynamic';

/** What the site actually books — each tile opens that filter. */
const OFFERINGS = [
  { label: 'Farmhouse', emoji: '🌾', href: '/stays?type=FARM_STAY' },
  { label: 'Villa', emoji: '🏡', href: '/stays?type=VILLA' },
  { label: 'Homestay', emoji: '🛏️', href: '/stays?type=HOMESTAY' },
  { label: 'Resort', emoji: '🏝️', href: '/stays?type=RESORT' },
  { label: 'Hotel', emoji: '🏨', href: '/stays?type=HOTEL' },
  { label: 'Restaurant', emoji: '🍽️', href: '/restaurants' },
];

export default async function HomePage() {
  const [settings, enabled] = await Promise.all([getSettings(), getEnabledServices()]);

  const [nearby, topStays, restaurants, destinations, spotCount, stayCount, restaurantCount] = await Promise.all([
    db.stay.findMany({
      where: { visible: true, city: { in: ['Badlapur', 'Karjat', 'Neral', 'Bhivpuri', 'Vangani', 'Ambernath'] } },
      include: { photos: { select: { id: true }, orderBy: { sort: 'asc' }, take: 1 } },
      orderBy: { price: 'asc' },
      take: 6,
    }),
    db.stay.findMany({
      where: { visible: true },
      include: { photos: { select: { id: true }, orderBy: { sort: 'asc' }, take: 1 } },
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
      take: 6,
    }),
    enabled.has('restaurants')
      ? db.restaurant.findMany({
          where: { visible: true },
          include: { photos: { select: { id: true }, orderBy: { sort: 'asc' }, take: 1 } },
          orderBy: { rating: 'desc' },
          take: 6,
        })
      : Promise.resolve([]),
    db.destination.findMany({ where: { visible: true }, orderBy: { sort: 'asc' }, take: 12 }),
    db.weekendSpot.count({ where: { visible: true } }),
    db.stay.count({ where: { visible: true } }),
    db.restaurant.count({ where: { visible: true } }),
  ]);

  return (
    <>
      <SiteHeader />

      <main>
        {/* ---------------------------------------------------------- hero */}
        <section style={{ background: 'var(--ink)', color: 'var(--mist)' }}>
          <div className="mx-auto max-w-6xl px-5 pb-14 pt-16 sm:pt-20">
            <p className="eyebrow" style={{ color: 'color-mix(in srgb, var(--mist) 55%, transparent)' }}>
              Badlapur · Karjat · Lonavala · Konkan
            </p>

            <h1 className="display mt-4 text-[clamp(40px,8vw,84px)]">
              Rehna, khaana,
              <br />
              <span style={{ color: 'var(--turmeric)' }}>ghoomna — sab yahan.</span>
            </h1>

            <p className="mt-5 max-w-[52ch] text-[16px] leading-relaxed opacity-75">{settings.heroSubtitle}</p>

            <div className="mt-8 max-w-2xl">
              <SearchBar />
            </div>

            {/* What the site books, said plainly and made clickable. */}
            <div className="mt-10 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {OFFERINGS.map((o) => (
                <Link key={o.label} href={o.href} className="card card-hover p-4 text-center">
                  <div className="text-[26px]" aria-hidden>{o.emoji}</div>
                  <div className="mt-1.5 text-[13px] font-semibold">{o.label}</div>
                </Link>
              ))}
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-6 border-t pt-8" style={{ borderColor: 'rgb(255 255 255 / 0.12)' }}>
              {(
                [
                  [stayCount, 'stays listed'],
                  [restaurantCount, 'restaurants'],
                  [destinations.length, 'destinations'],
                ] as const
              ).map(([n, label]) => (
                <div key={label}>
                  <dt className="data text-[26px] font-medium sm:text-[34px]">{n}</dt>
                  <dd className="mt-1 text-[12.5px] opacity-60">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ----------------------------------------------------------- rides */}
        {enabled.has('rides') && (
          <section className="mx-auto mt-20 max-w-6xl px-5">
            <div className="card grid gap-8 p-8 sm:p-12 lg:grid-cols-[1.2fr_1fr] lg:items-center">
              <div>
                <p className="eyebrow">Nayi service</p>
                <h2 className="display mt-3 text-[clamp(26px,4vw,40px)]">
                  Bike, e-bike aur <span style={{ color: 'var(--laterite)' }}>auto</span> rides
                </h2>
                <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed" style={{ color: 'var(--basalt)' }}>
                  Badlapur se Karjat tak chhoti trips. Aas-paas ka sabse nazdeeki rider apne aap match hota hai
                  aur aap use live map par aate hue dekh sakte hain.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href="/ride" className="btn btn-primary">Ride book karo</Link>
                  <Link href="/rider/apply" className="btn btn-secondary">Rider banna hai?</Link>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {([['\u{1F3CD}\uFE0F', 'Bike'], ['\u26A1', 'E-bike'], ['\u{1F6FA}', 'Auto']] as const).map(([e, l]) => (
                  <div key={l} className="card p-4 text-center">
                    <div className="text-[30px]" aria-hidden>{e}</div>
                    <div className="mt-1 text-[13px] font-semibold">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ------------------------------------------------------- near home */}
        <Section
          eyebrow="Ghar ke paas"
          title="Badlapur–Karjat belt"
          blurb="Ghar ke paas ki jagahein — ek ghante ke andar pahunch jao."
          href="/stays?city=Badlapur"
          linkLabel="Saare nearby stays"
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {nearby.map((s, i) => (
              <StayCard key={s.id} stay={s} index={i} />
            ))}
          </div>
        </Section>

        {/* ---------------------------------------------------- destinations */}
        <Section
          eyebrow="Aur aage"
          title="Maharashtra ki jagahein"
          blurb="Ghat, samundar, vineyard aur mandir — sab ek hi state mein."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {destinations.map((d, i) => (
              <Link
                key={d.id}
                href={`/stays?city=${encodeURIComponent(d.name)}`}
                className="card card-hover group relative block overflow-hidden"
              >
                <div className="aspect-[5/4]">
                  <Scene tone={d.tone} seed={i} />
                </div>
                <div
                  className="absolute inset-x-0 bottom-0 p-4"
                  style={{ background: 'linear-gradient(to top, rgb(16 38 31 / 0.86), transparent)' }}
                >
                  <div className="text-[15px] font-semibold" style={{ color: '#fff' }}>
                    {d.name}
                  </div>
                  <div className="data mt-0.5 text-[11.5px]" style={{ color: 'rgb(255 255 255 / 0.7)' }}>
                    {d.state} · {INR(d.price)}+
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Section>

        {/* --------------------------------------------------------- weekend */}
        {enabled.has('weekend') && (
          <section className="mx-auto mt-20 max-w-6xl px-5">
            <div
              className="overflow-hidden rounded-2xl p-8 sm:p-12"
              style={{ background: 'var(--ink)', color: 'var(--mist)' }}
            >
              <p className="eyebrow" style={{ color: 'color-mix(in srgb, var(--mist) 50%, transparent)' }}>
                Weekend planner
              </p>
              <h2 className="display mt-3 text-[clamp(28px,5vw,44px)]">
                Waterfall, dam, fort, caves — <span style={{ color: 'var(--turmeric)' }}>ek weekend mein</span>
              </h2>
              <p className="mt-4 max-w-[54ch] text-[15px] leading-relaxed opacity-70">
                {spotCount} spots Badlapur se 45 km ke andar, ghante-wise plan ke saath. Monsoon ke liye banaya gaya.
              </p>
              <Link href="/weekend" className="btn btn-primary mt-7">
                Weekend plan kholo
              </Link>
            </div>
          </section>
        )}

        {/* ------------------------------------------------------ top rated */}
        <Section
          eyebrow="Sabse achhe rated"
          title="Top stays"
          blurb="Rating aur reviews ke hisaab se."
          href="/stays"
          linkLabel="Saare stays"
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {topStays.map((s, i) => (
              <StayCard key={s.id} stay={s} index={i + 7} />
            ))}
          </div>
        </Section>

        {/* ----------------------------------------------------- restaurants */}
        {restaurants.length > 0 && (
          <Section
            eyebrow="Jevan"
            title="Restaurants aur khana"
            blurb="Misal se Malvani thali tak — address aur timings ke saath."
            href="/restaurants"
            linkLabel="Saare restaurants"
          >
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {restaurants.map((r, i) => (
                <RestaurantCard key={r.id} restaurant={r} index={i} />
              ))}
            </div>
          </Section>
        )}

        {/* --------------------------------------------------- partner call */}
        <section className="mx-auto mt-20 max-w-6xl px-5">
          <div className="card grid gap-8 p-8 sm:p-12 lg:grid-cols-[1.3fr_1fr] lg:items-center">
            <div>
              <p className="eyebrow">Farmhouse, hotel ya restaurant hai?</p>
              <h2 className="display mt-3 text-[clamp(26px,4vw,38px)]">Apni property yahan list karo</h2>
              <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed" style={{ color: 'var(--basalt)' }}>
                Form bharo, photos daalo, bas. Team review karke approve karti hai — uske baad aapki listing site
                par live ho jaati hai. Login banane ki zaroorat nahi.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/partner/apply" className="btn btn-primary">
                  Listing form bharo
                </Link>
                <Link href="/partner/status" className="btn btn-secondary">
                  Application status dekho
                </Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl">
              <div className="aspect-[4/3]">
                <Scene tone="farm" seed={5} />
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function Section({
  eyebrow,
  title,
  blurb,
  href,
  linkLabel,
  children,
}: {
  eyebrow: string;
  title: string;
  blurb?: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto mt-20 max-w-6xl px-5">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="display mt-2 text-[clamp(24px,4vw,36px)]">{title}</h2>
          {blurb && (
            <p className="mt-2 max-w-[56ch] text-[14.5px]" style={{ color: 'var(--basalt)' }}>
              {blurb}
            </p>
          )}
        </div>
        {href && linkLabel && (
          <Link href={href} className="text-[14px] font-semibold" style={{ color: 'var(--laterite)' }}>
            {linkLabel} →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
