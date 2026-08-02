import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getEnabledServices } from '@/lib/site';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Scene } from '@/components/Scene';
import { INR, mapDirectionsUrl } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Activities',
  description: 'Rafting, rappelling, trek, scuba aur heritage walks — Maharashtra bhar mein.',
};

export default async function ActivitiesPage() {
  const enabled = await getEnabledServices();
  if (!enabled.has('activities')) notFound();

  const activities = await db.activity.findMany({ where: { visible: true }, orderBy: { sort: 'asc' } });
  const categories = [...new Set(activities.map((a) => a.category))];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <p className="eyebrow">Karne layak</p>
        <h1 className="display mt-3 text-[clamp(30px,6vw,52px)]">Activities</h1>
        <p className="mt-3 max-w-[58ch] text-[15px]" style={{ color: 'var(--basalt)' }}>
          Monsoon rafting se leke fort treks tak — {categories.join(', ')}.
        </p>

        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((a, i) => (
            <article key={a.id} className="card card-hover overflow-hidden">
              <div className="relative aspect-[16/10]">
                <Scene tone={a.tone} seed={i + 6} />
                <span className="absolute bottom-3 left-3 text-[30px] leading-none drop-shadow" aria-hidden>
                  {a.emoji}
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[15.5px] font-semibold leading-snug">{a.title}</h2>
                  <span className="data shrink-0 text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
                    {a.hours}h
                  </span>
                </div>
                <p className="mt-1 text-[13px]" style={{ color: 'var(--basalt-soft)' }}>
                  {a.city}
                </p>
                <div className="mt-3">
                  <span className="chip text-[11.5px]">{a.category}</span>
                </div>
                <div className="mt-4 flex items-end justify-between border-t pt-3">
                  <div>
                    <span className="data text-[18px] font-medium">{INR(a.price)}</span>
                    <span className="text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
                      {' '}
                      / person
                    </span>
                  </div>
                  <a
                    className="text-[13px] font-semibold"
                    style={{ color: 'var(--laterite)' }}
                    href={mapDirectionsUrl(a.city)}
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
      </main>
      <SiteFooter />
    </>
  );
}
