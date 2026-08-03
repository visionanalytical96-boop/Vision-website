import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getEnabledServices } from '@/lib/site';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { StayCard } from '@/components/StayCard';
import { Scene } from '@/components/Scene';
import { INR, mapDirectionsUrl } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Badlapur → Karjat weekend',
  description: 'Waterfall, dam, fort, caves aur rafting — Badlapur se Karjat tak ka weekend plan, ghante-wise.',
};

export default async function WeekendPage() {
  const enabled = await getEnabledServices();
  if (!enabled.has('weekend')) notFound();

  const [spots, plans, stays] = await Promise.all([
    db.weekendSpot.findMany({ where: { visible: true }, orderBy: { sort: 'asc' } }),
    db.weekendPlan.findMany({ where: { visible: true }, orderBy: { sort: 'asc' } }),
    db.stay.findMany({
      where: { visible: true, city: { in: ['Badlapur', 'Karjat', 'Neral', 'Bhivpuri', 'Vangani'] } },
      include: { photos: { select: { id: true }, orderBy: { sort: 'asc' }, take: 1 } },
      orderBy: { price: 'asc' },
      take: 6,
    }),
  ]);

  return (
    <>
      <SiteHeader />
      <main>
        <section style={{ background: 'var(--panel)', color: 'var(--panel-ink)' }}>
          <div className="mx-auto max-w-6xl px-5 pb-12 pt-14">
            <p className="eyebrow" style={{ color: 'color-mix(in srgb, var(--mist) 55%, transparent)' }}>
              Weekend planner
            </p>
            <h1 className="display mt-4 text-[clamp(34px,7vw,68px)]">
              Badlapur <span style={{ color: 'var(--turmeric)' }}>→</span> Karjat
            </h1>
            <p className="mt-4 max-w-[56ch] text-[15.5px] leading-relaxed opacity-75">
              Ghar ke paas ka perfect weekend — waterfalls, dam, forts, caves, rafting aur riverside villas.
              Badlapur se ek ghante ke andar, sab kuch.
            </p>
          </div>
        </section>

        {/* plans */}
        {plans.length > 0 && (
          <section className="mx-auto mt-16 max-w-6xl px-5">
            <p className="eyebrow">Ready plans</p>
            <h2 className="display mt-2 text-[clamp(24px,4vw,36px)]">Ghante-wise plan</h2>
            <div className="mt-7 grid gap-5 lg:grid-cols-2">
              {plans.map((p) => {
                const steps = Array.isArray(p.steps) ? (p.steps as [string, string][]) : [];
                return (
                  <article key={p.id} className="card p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <h3 className="text-[18px] font-semibold">{p.title}</h3>
                      <div className="text-right">
                        <div className="data text-[20px] font-medium">{INR(p.price)}</div>
                        <div className="text-[11.5px]" style={{ color: 'var(--basalt-soft)' }}>
                          {p.per}
                        </div>
                      </div>
                    </div>
                    <ol className="mt-5 space-y-3">
                      {steps.map(([time, what], i) => (
                        <li key={i} className="grid grid-cols-[74px_1fr] gap-3">
                          <span className="data text-[12.5px]" style={{ color: 'var(--laterite)' }}>
                            {time}
                          </span>
                          <span className="text-[14px]">{what}</span>
                        </li>
                      ))}
                    </ol>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* spots */}
        <section className="mx-auto mt-16 max-w-6xl px-5">
          <p className="eyebrow">Spots</p>
          <h2 className="display mt-2 text-[clamp(24px,4vw,36px)]">
            Kya-kya dekhne layak hai{' '}
            <span className="text-[15px] font-normal" style={{ color: 'var(--basalt-soft)' }}>
              (Badlapur se doori)
            </span>
          </h2>

          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {spots.map((s, i) => (
              <article key={s.id} className="card card-hover overflow-hidden">
                <div className="aspect-[16/9]">
                  <Scene tone={s.tone} seed={i + 2} />
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[15.5px] font-semibold">{s.name}</h3>
                    <span className="data shrink-0 text-[12px]" style={{ color: 'var(--laterite)' }}>
                      {s.dist}
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px]" style={{ color: 'var(--basalt-soft)' }}>
                    {s.place}
                  </p>
                  <p className="mt-3 text-[13.5px] leading-relaxed" style={{ color: 'var(--basalt)' }}>
                    {s.desc}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="chip text-[11.5px]">{s.tag}</span>
                    <a
                      className="text-[13px] font-semibold"
                      style={{ color: 'var(--laterite)' }}
                      href={mapDirectionsUrl(s.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Directions →
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* stays on the line */}
        {stays.length > 0 && (
          <section className="mx-auto mt-16 max-w-6xl px-5">
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Rukna kahan</p>
                <h2 className="display mt-2 text-[clamp(24px,4vw,36px)]">Aas-paas ke stays</h2>
              </div>
              <Link href="/stays?city=Karjat" className="text-[14px] font-semibold" style={{ color: 'var(--laterite)' }}>
                Saare dekho →
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {stays.map((s, i) => (
                <StayCard key={s.id} stay={s} index={i} />
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
