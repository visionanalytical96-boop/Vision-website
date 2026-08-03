'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LiveMap } from './LiveMap';
import type { MapPin } from './BeltMap';
import { INR, mapDirectionsUrl } from '@/lib/format';

type Offer = {
  id: string; ref: string; pickupLabel: string; dropLabel: string;
  pickupLat: number; pickupLng: number; distanceKm: number; fare: number; offerExpiresAt: string;
};
type Active = {
  id: string; ref: string; status: string; pickupLabel: string; dropLabel: string;
  pickupLat: number; pickupLng: number; dropLat: number; dropLng: number;
  distanceKm: number; fare: number; customerName: string; customerPhone: string;
};

const PING_MS = 8000;

export function RiderConsole({ name, vehicleNumber }: { name: string; vehicleNumber: string }) {
  const [online, setOnline] = useState(false);
  const [pos, setPos] = useState<{ lat: number; lng: number; accuracyM?: number } | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [active, setActive] = useState<Active | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [otp, setOtp] = useState('');
  const watchRef = useRef<number | null>(null);
  const posRef = useRef<typeof pos>(null);
  posRef.current = pos;

  const ping = useCallback(async (isOnline: boolean) => {
    const p = posRef.current;
    const res = await fetch('/api/rider/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ online: isOnline, ...(p ? { lat: p.lat, lng: p.lng, accuracyM: p.accuracyM } : {}) }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? 'Server se baat nahi ho payi');
      return;
    }
    setError(null);
    setOffer(json.offer ?? null);
    setActive(json.active ?? null);
  }, []);

  // Location watch + heartbeat. The server treats a rider with a stale
  // heartbeat as offline, so this interval is what keeps them matchable.
  useEffect(() => {
    if (!online) return;

    if (!('geolocation' in navigator)) {
      setError('Is browser mein location support nahi hai');
      setOnline(false);
      return;
    }

    watchRef.current = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: p.coords.accuracy }),
      (e) => {
        setError(
          e.code === e.PERMISSION_DENIED
            ? 'Location ki permission deni hogi, tabhi rides mil sakengi'
            : 'Location nahi mil rahi — khule aasman ke neeche try kijiye',
        );
        setOnline(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );

    void ping(true);
    const id = setInterval(() => void ping(true), PING_MS);
    return () => {
      clearInterval(id);
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [online, ping]);

  async function trip(action: string, extra: Record<string, string> = {}) {
    const rideId = active?.id ?? offer?.id;
    if (!rideId) return;
    setBusy(true);
    const res = await fetch('/api/rider/trip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rideId, action, ...extra }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? 'Nahi ho paya');
    setError(null);
    setOtp('');
    await ping(online);
  }

  const pins: MapPin[] = [];
  if (pos) pins.push({ ...pos, label: 'Aap', kind: 'me' });
  if (active) {
    pins.push({ lat: active.pickupLat, lng: active.pickupLng, label: 'Pickup', kind: 'pickup' });
    pins.push({ lat: active.dropLat, lng: active.dropLng, label: 'Drop', kind: 'drop' });
  } else if (offer) {
    pins.push({ lat: offer.pickupLat, lng: offer.pickupLng, label: 'Pickup', kind: 'pickup' });
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Rider console</p>
          <h1 className="display mt-2 text-[clamp(26px,5vw,38px)]">{name}</h1>
          <p className="data mt-1 text-[13px]" style={{ color: 'var(--basalt-soft)' }}>
            {vehicleNumber}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={online}
          onClick={() => {
            const next = !online;
            setOnline(next);
            if (!next) void ping(false);
          }}
          className="btn"
          style={{
            background: online ? 'var(--monsoon)' : 'var(--ink)',
            color: '#fff',
            minWidth: '140px',
          }}
        >
          {online ? '● Online' : '○ Offline'}
        </button>
      </div>

      {error && (
        <p
          className="mt-5 rounded-lg px-4 py-3 text-[13.5px]"
          style={{ background: 'color-mix(in srgb, var(--laterite) 12%, transparent)', color: 'var(--laterite)' }}
          role="alert"
        >
          {error}
        </p>
      )}

      {!online && !active && (
        <div className="card mt-6 p-6">
          <p className="text-[15px] font-medium">Online jaaiye</p>
          <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: 'var(--basalt)' }}>
            Online karte hi browser aapki location poochhega. Permission dene par aapke aas-paas ki ride requests
            yahin dikhengi. Yeh page khula rehna chahiye.
          </p>
        </div>
      )}

      {online && !offer && !active && (
        <div className="card mt-6 p-6">
          <p className="text-[15px] font-medium">Request ka intezaar hai…</p>
          <p className="mt-2 text-[13.5px]" style={{ color: 'var(--basalt)' }}>
            {pos
              ? `Location mil gayi (±${Math.round(pos.accuracyM ?? 0)} m). Aap matching mein hain.`
              : 'Location li ja rahi hai…'}
          </p>
        </div>
      )}

      {/* ------------------------------------------------------ new offer */}
      {offer && !active && (
        <div className="card mt-6 overflow-hidden" style={{ borderColor: 'var(--laterite)', boxShadow: '0 0 0 2px var(--laterite)' }}>
          <div className="px-6 py-4" style={{ background: 'var(--laterite)', color: '#fff' }}>
            <span className="eyebrow" style={{ color: 'rgb(255 255 255 / 0.75)' }}>
              Nayi ride
            </span>
            <div className="data mt-1 text-[24px] font-medium">{INR(offer.fare)}</div>
          </div>
          <div className="p-6">
            <dl className="space-y-3 text-[14px]">
              <div>
                <dt className="text-[12px]" style={{ color: 'var(--basalt-soft)' }}>Pickup</dt>
                <dd className="font-medium">{offer.pickupLabel}</dd>
              </div>
              <div>
                <dt className="text-[12px]" style={{ color: 'var(--basalt-soft)' }}>Drop</dt>
                <dd className="font-medium">{offer.dropLabel}</dd>
              </div>
              <div className="data text-[13px]" style={{ color: 'var(--basalt)' }}>
                ~{offer.distanceKm} km (seedhi doori)
              </div>
            </dl>
            <div className="mt-5 flex gap-3">
              <button className="btn btn-primary flex-1" disabled={busy} onClick={() => trip('accept')}>
                Accept karo
              </button>
              <button className="btn btn-secondary" disabled={busy} onClick={() => trip('decline')}>
                Nahi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------- active trip */}
      {active && (
        <div className="card mt-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="chip chip-on">{active.status}</span>
            <span className="data text-[20px] font-medium">{INR(active.fare)}</span>
          </div>

          <dl className="mt-5 space-y-3 text-[14px]">
            <div>
              <dt className="text-[12px]" style={{ color: 'var(--basalt-soft)' }}>Pickup</dt>
              <dd className="font-medium">{active.pickupLabel}</dd>
            </div>
            <div>
              <dt className="text-[12px]" style={{ color: 'var(--basalt-soft)' }}>Drop</dt>
              <dd className="font-medium">{active.dropLabel}</dd>
            </div>
            <div>
              <dt className="text-[12px]" style={{ color: 'var(--basalt-soft)' }}>Customer</dt>
              <dd className="font-medium">
                {active.customerName} · <a href={`tel:${active.customerPhone}`} style={{ color: 'var(--laterite)' }}>{active.customerPhone}</a>
              </dd>
            </div>
          </dl>

          <a
            className="btn btn-secondary btn-sm mt-4"
            href={mapDirectionsUrl(active.status === 'ONGOING' ? active.dropLabel : active.pickupLabel)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Maps par raasta
          </a>

          <div className="mt-6 flex flex-wrap gap-3">
            {active.status === 'ACCEPTED' && (
              <button className="btn btn-primary" disabled={busy} onClick={() => trip('arrived')}>
                Pahunch gaya
              </button>
            )}
            {(active.status === 'ARRIVED' || active.status === 'ACCEPTED') && (
              <div className="flex w-full gap-2">
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  maxLength={4}
                  inputMode="numeric"
                  placeholder="Customer ka 4-digit OTP"
                  className="flex-1 rounded-lg border px-4 py-2.5 text-[15px] outline-none"
                  style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--surface-ink)', letterSpacing: '0.3em' }}
                />
                <button className="btn btn-primary" disabled={busy || otp.length !== 4} onClick={() => trip('start', { otp })}>
                  Trip shuru
                </button>
              </div>
            )}
            {active.status === 'ONGOING' && (
              <button className="btn btn-primary" disabled={busy} onClick={() => trip('complete')}>
                Trip poori hui
              </button>
            )}
            <button className="btn btn-secondary" disabled={busy} onClick={() => trip('cancel')}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {pins.length > 0 && (
        <div className="card mt-6 p-4">
          <LiveMap pins={pins} route height={360} />
        </div>
      )}

      <p className="mt-6 text-[12px] leading-relaxed" style={{ color: 'var(--basalt-soft)' }}>
        Doori seedhi rekha se nikaali jaati hai, isliye asli raasta thoda lamba hoga. Turn-by-turn ke liye Google
        Maps ka button use kijiye.
      </p>
    </main>
  );
}
