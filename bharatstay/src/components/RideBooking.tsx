'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BELT_LANDMARKS, inBelt } from '@/lib/belt';
import { LiveMap } from './LiveMap';
import type { MapPin } from './BeltMap';
import { INR } from '@/lib/format';

type Fare = { vehicleType: string; label: string; baseFare: number; perKm: number; minFare: number; seats: number };
type Point = { label: string; lat: number; lng: number } | null;

const EMOJI: Record<string, string> = { BIKE: '🏍️', EBIKE: '⚡', AUTO: '🛺', CAB: '🚗', CAB_XL: '🚙' };
const SEATS: Record<string, number> = { BIKE: 1, EBIKE: 1, AUTO: 3, CAB: 4, CAB_XL: 6 };

export function RideBooking({
  fares,
  defaultName,
  defaultPhone,
}: {
  fares: Fare[];
  defaultName: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const [vehicleType, setVehicleType] = useState(fares[0]?.vehicleType ?? 'BIKE');
  const [pickup, setPickup] = useState<Point>(null);
  const [drop, setDrop] = useState<Point>(null);
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone.replace(/\D/g, '').slice(-10));
  const [quote, setQuote] = useState<{ distanceKm: number; roadKm: number; fare: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  // Re-quote whenever the trip or vehicle changes, so the price on screen is
  // always the price the server would charge.
  useEffect(() => {
    if (!pickup || !drop) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'quote',
          vehicleType,
          pickup: { lat: pickup.lat, lng: pickup.lng },
          drop: { lat: drop.lat, lng: drop.lng },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setQuote(null);
        setError(json.error ?? null);
        return;
      }
      setError(null);
      setQuote(json);
    })();
    return () => {
      cancelled = true;
    };
  }, [pickup, drop, vehicleType]);

  function useMyLocation() {
    if (!('geolocation' in navigator)) return setError('Is browser mein location support nahi hai');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        const { latitude: lat, longitude: lng } = p.coords;
        if (!inBelt(lat, lng)) {
          setError('Aap abhi Badlapur–Karjat belt ke bahar hain — neeche se jagah chun lijiye');
          return;
        }
        setError(null);
        setPickup({ label: 'Meri location', lat, lng });
      },
      () => {
        setLocating(false);
        setError('Location nahi mili — neeche se jagah chun lijiye');
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  const pins: MapPin[] = [];
  if (pickup) pins.push({ ...pickup, label: 'Pickup', kind: 'pickup' });
  if (drop) pins.push({ ...drop, label: 'Drop', kind: 'drop' });

  return (
    <div>
      <p className="eyebrow mb-3">Gaadi chuniye</p>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {fares.map((f) => (
          <button
            key={f.vehicleType}
            type="button"
            aria-pressed={vehicleType === f.vehicleType}
            onClick={() => setVehicleType(f.vehicleType)}
            className="card card-hover p-4 text-left"
            style={vehicleType === f.vehicleType ? { borderColor: 'var(--laterite)', boxShadow: '0 0 0 2px var(--laterite)' } : undefined}
          >
            <div className="text-[26px]" aria-hidden>{EMOJI[f.vehicleType]}</div>
            <div className="mt-1 text-[15px] font-semibold">{f.label}</div>
            <div className="data mt-0.5 text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
              ₹{f.baseFare} + ₹{f.perKm}/km
            </div>
            <div className="mt-0.5 text-[11.5px]" style={{ color: 'var(--basalt-soft)' }}>
              {SEATS[f.vehicleType] ?? f.seats} {(SEATS[f.vehicleType] ?? f.seats) === 1 ? 'sawaari' : 'log'}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <PlacePicker
          title="Kahan se"
          value={pickup}
          onChange={setPickup}
          extra={
            <button type="button" className="btn btn-secondary btn-sm" onClick={useMyLocation} disabled={locating}>
              {locating ? 'Location li ja rahi…' : '📍 Meri location'}
            </button>
          }
        />
        <PlacePicker title="Kahan tak" value={drop} onChange={setDrop} />
      </div>

      {pins.length > 0 && (
        <div className="card mt-6 p-4">
          <LiveMap pins={pins} route height={380} />
        </div>
      )}

      {quote && (
        <div className="card mt-6 p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Anumaanit kiraya</p>
              <div className="data mt-1 text-[32px] font-medium">{INR(quote.fare)}</div>
            </div>
            <p className="data text-[13px]" style={{ color: 'var(--basalt-soft)' }}>
              ~{quote.roadKm} km raasta
            </p>
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed" style={{ color: 'var(--basalt-soft)' }}>
            Doori seedhi rekha se nikaal kar raaste ke hisaab se badhaayi gayi hai — asli raasta thoda alag ho
            sakta hai. Paisa rider ko seedha dena hai.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="rname">Aapka naam</label>
          <input id="rname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jaise: Ravi Patil" />
        </div>
        <div className="field">
          <label htmlFor="rphone">Mobile number</label>
          <input
            id="rphone"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            maxLength={10}
            inputMode="numeric"
            placeholder="98765 43210"
          />
        </div>
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

      <button
        className="btn btn-primary mt-6 w-full sm:w-auto"
        disabled={busy || !quote || name.trim().length < 2 || phone.length < 10}
        onClick={async () => {
          if (!pickup || !drop) return;
          setBusy(true);
          setError(null);
          const res = await fetch('/api/rides', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'book',
              vehicleType,
              pickup,
              drop,
              customerName: name.trim(),
              customerPhone: phone,
            }),
          });
          const json = await res.json().catch(() => ({}));
          setBusy(false);
          if (!res.ok) return setError(json.error ?? 'Ride book nahi ho payi');
          router.push(`/ride/${json.ref}`);
        }}
      >
        {busy ? 'Rider dhoondh rahe hain…' : quote ? `${INR(quote.fare)} — rider bulao` : 'Pehle jagah chuniye'}
      </button>
    </div>
  );
}

function PlacePicker({
  title,
  value,
  onChange,
  extra,
}: {
  title: string;
  value: Point;
  onChange: (p: Point) => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">{title}</p>
        {extra}
      </div>
      <div className="field mt-3">
        <label className="sr-only" htmlFor={`sel-${title}`}>
          {title}
        </label>
        <select
          id={`sel-${title}`}
          value={value && value.label !== 'Meri location' ? value.label : ''}
          onChange={(e) => {
            const l = BELT_LANDMARKS.find((x) => x.label === e.target.value);
            onChange(l ? { label: l.label, lat: l.lat, lng: l.lng } : null);
          }}
        >
          <option value="">Jagah chuniye…</option>
          {BELT_LANDMARKS.map((l) => (
            <option key={l.label} value={l.label}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      {value && (
        <p className="mt-2 text-[13px] font-medium" style={{ color: 'var(--monsoon)' }}>
          ✓ {value.label}
        </p>
      )}
    </div>
  );
}
