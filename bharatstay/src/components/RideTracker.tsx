'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BeltMap, type MapPin } from './BeltMap';
import { INR } from '@/lib/format';

type Ride = {
  ref: string;
  status: string;
  vehicle: string;
  pickup: { label: string; lat: number; lng: number };
  drop: { label: string; lat: number; lng: number };
  distanceKm: number;
  fare: number;
  startOtp: string | null;
  cancelReason: string | null;
  rider: {
    name: string; phone: string; vehicleNumber: string; vehicle: string;
    lat: number | null; lng: number | null; awayKm: number | null;
  } | null;
};

const POLL_MS = 4000;

const STATE: Record<string, { title: string; body: string; tone: string }> = {
  REQUESTED: { title: 'Rider dhoondh rahe hain…', body: 'Aas-paas ke sabse nazdeeki rider ko request bheji ja rahi hai.', tone: 'var(--turmeric)' },
  ACCEPTED: { title: 'Rider aa raha hai', body: 'Aapka rider pickup point ki taraf nikal chuka hai.', tone: 'var(--monsoon)' },
  ARRIVED: { title: 'Rider pahunch gaya', body: 'Rider ko neeche wala 4-digit code bataiye, tabhi trip shuru hogi.', tone: 'var(--monsoon)' },
  ONGOING: { title: 'Trip chal rahi hai', body: 'Safe safar! Drop par pahunchte hi trip poori ho jayegi.', tone: 'var(--monsoon)' },
  COMPLETED: { title: 'Trip poori hui', body: 'Shukriya! Kiraya rider ko seedha dijiye.', tone: 'var(--monsoon)' },
  CANCELLED: { title: 'Ride cancel ho gayi', body: 'Aap dobara book kar sakte hain.', tone: 'var(--laterite)' },
  NO_RIDER: { title: 'Abhi koi rider nahi mila', body: 'Is waqt aas-paas koi rider online nahi hai. Thodi der baad dobara try kijiye.', tone: 'var(--laterite)' },
};

export function RideTracker({ refCode }: { refCode: string }) {
  const [ride, setRide] = useState<Ride | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/rides/${refCode}`, { cache: 'no-store' });
        const json = await res.json();
        if (stop) return;
        if (!res.ok) return setError(json.error ?? 'Ride nahi mili');
        setError(null);
        setRide(json);
      } catch {
        // A dropped poll is normal on a phone; the next tick recovers.
      }
    };
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [refCode]);

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-[16px] font-medium">{error}</p>
        <Link href="/ride" className="btn btn-primary mt-5">
          Nayi ride book karo
        </Link>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="card p-8 text-center text-[14px]" style={{ color: 'var(--basalt-soft)' }}>
        Ride khul rahi hai…
      </div>
    );
  }

  const state = STATE[ride.status] ?? STATE.REQUESTED!;
  const done = ride.status === 'COMPLETED' || ride.status === 'CANCELLED' || ride.status === 'NO_RIDER';

  const pins: MapPin[] = [
    { ...ride.pickup, label: 'Pickup', kind: 'pickup' },
    { ...ride.drop, label: 'Drop', kind: 'drop' },
  ];
  if (ride.rider?.lat != null && ride.rider.lng != null) {
    pins.push({ lat: ride.rider.lat, lng: ride.rider.lng, label: ride.rider.name, kind: 'rider' });
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="eyebrow">Ride · {ride.vehicle}</p>
          <h1 className="data mt-2 text-[clamp(24px,5vw,34px)] font-medium">{ride.ref}</h1>
        </div>
        <span className="data text-[22px] font-medium">{INR(ride.fare)}</span>
      </div>

      <div className="mt-6 rounded-xl px-5 py-4" style={{ background: `color-mix(in srgb, ${state.tone} 16%, transparent)` }}>
        <div className="flex items-center gap-2">
          {!done && (
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: state.tone, animation: 'pulse 1.4s ease-in-out infinite' }}
              aria-hidden
            />
          )}
          <span className="text-[15.5px] font-semibold">{state.title}</span>
        </div>
        <p className="mt-1 text-[14px] leading-relaxed">{ride.cancelReason ?? state.body}</p>
      </div>

      {/* The code only matters while a trip can still be started. */}
      {ride.startOtp && (ride.status === 'ACCEPTED' || ride.status === 'ARRIVED') && (
        <div className="card mt-5 p-5 text-center" style={{ borderStyle: 'dashed', borderColor: 'var(--monsoon)' }}>
          <div className="eyebrow" style={{ color: 'var(--monsoon)' }}>
            Rider ko yeh code bataiye
          </div>
          <div className="data mt-2 text-[38px] font-medium tracking-[0.34em]">{ride.startOtp}</div>
        </div>
      )}

      {ride.rider && (
        <div className="card mt-5 p-5">
          <p className="eyebrow">Aapka rider</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[17px] font-semibold">{ride.rider.name}</div>
              <div className="data mt-0.5 text-[13px]" style={{ color: 'var(--basalt-soft)' }}>
                {ride.rider.vehicle} · {ride.rider.vehicleNumber}
              </div>
            </div>
            <a className="btn btn-primary btn-sm" href={`tel:${ride.rider.phone}`}>
              Call karo
            </a>
          </div>
          {ride.rider.awayKm !== null && !done && (
            <p className="data mt-3 text-[13px]" style={{ color: 'var(--basalt)' }}>
              ~{ride.rider.awayKm} km door {ride.status === 'ONGOING' ? 'drop se' : 'pickup se'}
            </p>
          )}
        </div>
      )}

      <div className="card mt-5 p-4">
        <BeltMap pins={pins} />
      </div>

      <dl className="card mt-5 divide-y overflow-hidden text-[14px]">
        {(
          [
            ['Pickup', ride.pickup.label],
            ['Drop', ride.drop.label],
            ['Doori', `~${ride.distanceKm} km (seedhi rekha)`],
            ['Kiraya', INR(ride.fare)],
          ] as [string, string][]
        ).map(([k, v]) => (
          <div key={k} className="grid grid-cols-[90px_1fr] gap-3 px-5 py-3">
            <dt style={{ color: 'var(--basalt-soft)' }}>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      {done && (
        <Link href="/ride" className="btn btn-primary mt-6">
          Nayi ride book karo
        </Link>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
    </div>
  );
}
