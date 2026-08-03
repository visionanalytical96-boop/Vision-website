import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getEnabledServices } from '@/lib/site';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Scene } from '@/components/Scene';
import { INR } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Holiday packages',
  description: 'Maharashtra ke ready-made trips — hotel, khana aur transport ke saath.',
};

export default async function PackagesPage() {
  const enabled = await getEnabledServices();
  if (!enabled.has('packages')) notFound();

  const packages = await db.package.findMany({ where: { visible: true }, orderBy: { sort: 'asc' } });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <p className="eyebrow">Sab kuch shaamil</p>
        <h1 className="display mt-3 text-[clamp(30px,6vw,52px)]">Holiday packages</h1>
        <p className="mt-3 max-w-[58ch] text-[15px]" style={{ color: 'var(--basalt)' }}>
          Hotel, khana aur transport — sab pehle se tay. Bas bag uthao aur nikal jao.
        </p>

        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((p, i) => (
            <article key={p.id} className="card card-hover overflow-hidden">
              <div className="relative aspect-[16/10]">
                <Scene tone={p.tone} seed={i + 1} />
                <span
                  className="data absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium"
                  style={{ background: 'var(--surface)', color: 'var(--surface-ink)' }}
                >
                  {p.nights}N / {p.days}D
                </span>
              </div>
              <div className="p-5">
                <h2 className="text-[16px] font-semibold leading-snug">{p.title}</h2>
                <p className="mt-1 text-[13px]" style={{ color: 'var(--basalt-soft)' }}>
                  {p.dest}
                </p>

                <ul className="mt-4 space-y-1.5 text-[13px]" style={{ color: 'var(--basalt)' }}>
                  <li>🏨 {p.hotel}</li>
                  <li>🍽️ {p.meal}</li>
                  <li>🚗 {p.transport}</li>
                </ul>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.sights.slice(0, 3).map((s) => (
                    <span key={s} className="chip text-[11.5px]">
                      {s}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex items-end justify-between border-t pt-3">
                  <div>
                    <span className="data text-[19px] font-medium">{INR(p.price)}</span>
                    <span className="text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
                      {' '}
                      / person
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
