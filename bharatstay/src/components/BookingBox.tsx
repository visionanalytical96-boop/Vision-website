'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { INR } from '@/lib/format';

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function BookingBox({
  staySlug,
  stayName,
  price,
  basePrice,
  off,
  tax,
  taxPct,
}: {
  staySlug: string;
  stayName: string;
  price: number;
  basePrice: number;
  off: number;
  tax: number;
  taxPct: number;
}) {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [checkIn, setCheckIn] = useState(iso(today));
  const [checkOut, setCheckOut] = useState(iso(new Date(today.getTime() + 86_400_000)));
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);

  const nights = Math.max(
    1,
    Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000) || 1,
  );
  const base = price * nights * rooms;
  const taxes = Math.round((base * taxPct) / 100);
  const total = base + taxes;

  return (
    <aside className="card sticky top-24 p-6">
      <div className="flex items-end gap-2">
        {off > 0 && (
          <span className="data text-[14px] line-through" style={{ color: 'var(--basalt-soft)' }}>
            {INR(basePrice)}
          </span>
        )}
        <span className="data text-[28px] font-medium">{INR(price)}</span>
        <span className="text-[13px]" style={{ color: 'var(--basalt-soft)' }}>
          / night
        </span>
      </div>
      <p className="mt-1 text-[12.5px]" style={{ color: 'var(--basalt-soft)' }}>
        +{taxPct}% taxes · {INR(tax)} per night
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="field">
          <label htmlFor="in">Check-in</label>
          <input id="in" type="date" value={checkIn} min={iso(today)} onChange={(e) => setCheckIn(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="out">Check-out</label>
          <input id="out" type="date" value={checkOut} min={checkIn} onChange={(e) => setCheckOut(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="guests">Guests</label>
          <input id="guests" type="number" min={1} max={40} value={guests} onChange={(e) => setGuests(Math.max(1, Number(e.target.value)))} />
        </div>
        <div className="field">
          <label htmlFor="rooms">Rooms</label>
          <input id="rooms" type="number" min={1} max={20} value={rooms} onChange={(e) => setRooms(Math.max(1, Number(e.target.value)))} />
        </div>
      </div>

      <dl className="mt-5 space-y-2 border-t pt-4 text-[14px]">
        <Row label={`${INR(price)} × ${nights} ${nights === 1 ? 'night' : 'nights'}${rooms > 1 ? ` × ${rooms} rooms` : ''}`} value={INR(base)} />
        <Row label={`Taxes & fees (${taxPct}%)`} value={INR(taxes)} />
        <div className="flex items-baseline justify-between border-t pt-3 text-[16px] font-semibold">
          <span>Total</span>
          <span className="data">{INR(total)}</span>
        </div>
      </dl>

      <button
        className="btn btn-primary mt-5 w-full"
        onClick={() => {
          const params = new URLSearchParams({
            stay: staySlug,
            in: checkIn,
            out: checkOut,
            guests: String(guests),
            rooms: String(rooms),
          });
          router.push(`/book?${params}`);
        }}
      >
        {stayName.length > 22 ? 'Book karo' : `Book ${stayName.split(' ')[0]}`}
      </button>

      <p className="mt-3 text-center text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
        Abhi paise nahi katenge — agle step par details bharni hain.
      </p>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt style={{ color: 'var(--basalt)' }}>{label}</dt>
      <dd className="data">{value}</dd>
    </div>
  );
}
