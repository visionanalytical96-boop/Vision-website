import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getEnabledServices } from '@/lib/site';
import { getSession } from '@/lib/auth/session';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { RideBooking } from '@/components/RideBooking';
import { onlineWhere } from '@/lib/rides';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Bike & auto rides',
  description: 'Badlapur se Karjat tak bike, e-bike aur auto rides — nazdeeki rider turant.',
};

export default async function RidePage() {
  const enabled = await getEnabledServices();
  if (!enabled.has('rides')) notFound();

  const [fares, onlineCount, session] = await Promise.all([
    db.fareRule.findMany({ where: { enabled: true }, orderBy: { vehicleType: 'asc' } }),
    db.rider.count({ where: onlineWhere() }),
    getSession(),
  ]);

  return (
    <>
      <SiteHeader />
      <main>
        <section style={{ background: 'var(--ink)', color: 'var(--mist)' }}>
          <div className="mx-auto max-w-4xl px-5 pb-10 pt-14">
            <p className="eyebrow" style={{ color: 'color-mix(in srgb, var(--mist) 55%, transparent)' }}>
              Badlapur → Karjat belt
            </p>
            <h1 className="display mt-4 text-[clamp(34px,7vw,62px)]">
              Bike, e-bike, <span style={{ color: 'var(--turmeric)' }}>auto</span>
            </h1>
            <p className="mt-4 max-w-[52ch] text-[15.5px] leading-relaxed opacity-75">
              Aas-paas ka sabse nazdeeki rider apne aap match hota hai. Local trips ke liye — station se ghar,
              ghar se naka.
            </p>
            <p className="data mt-6 text-[13px] opacity-70">
              {onlineCount > 0 ? `${onlineCount} rider abhi online` : 'Abhi koi rider online nahi'}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-4xl px-5 py-10">
          <RideBooking
            fares={fares.map((f) => ({
              vehicleType: f.vehicleType,
              label: f.label,
              baseFare: f.baseFare,
              perKm: f.perKm,
              minFare: f.minFare,
            }))}
            defaultName={session?.name ?? ''}
            defaultPhone={session?.phone ?? ''}
          />

          <div className="card mt-10 p-6">
            <h2 className="text-[16px] font-semibold">Apni gaadi hai?</h2>
            <p className="mt-2 text-[14px] leading-relaxed" style={{ color: 'var(--basalt)' }}>
              Bike, e-bike ya auto se kamaana chahte hain? Register kijiye — admin verify karega, phir aap apne
              phone se online jaake rides le sakte hain.
            </p>
            <Link href="/rider/apply" className="btn btn-secondary mt-4">
              Rider banne ke liye register karo
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
