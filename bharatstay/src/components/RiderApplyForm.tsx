'use client';

import { resizeFormPhotos } from '@/lib/resize-image';
import { useState } from 'react';

const VEHICLES = [
  { value: 'BIKE', label: 'Bike', emoji: '🏍️', note: 'Petrol motorcycle ya scooter' },
  { value: 'EBIKE', label: 'E-bike', emoji: '⚡', note: 'Electric scooter ya bike' },
  { value: 'AUTO', label: 'Auto', emoji: '🛺', note: 'Auto rickshaw · 3 log' },
  { value: 'CAB', label: 'Cab', emoji: '🚗', note: 'Sedan ya hatchback · 4 log' },
  { value: 'CAB_XL', label: 'Cab XL', emoji: '🚙', note: 'SUV ya Innova · 6 log' },
] as const;

const CITIES = ['Badlapur', 'Ambernath', 'Vangani', 'Neral', 'Bhivpuri', 'Karjat'];

export function RiderApplyForm() {
  const [vehicleType, setVehicleType] = useState<string>('BIKE');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="card p-8 text-center">
        <div className="text-[40px]" aria-hidden>
          ✅
        </div>
        <h2 className="display mt-3 text-[26px]">Application bhej di</h2>
        <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: 'var(--basalt)' }}>
          Admin aapki gaadi aur licence verify karega. Approve hote hi aap usi mobile number se login karke online
          ja sakenge — hum aapko alag se batayenge.
        </p>
      </div>
    );
  }

  return (
    <form
      className="card p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const data = new FormData(e.currentTarget);
        data.set('vehicleType', vehicleType);
        await resizeFormPhotos(data);
        const res = await fetch('/api/rider/apply', { method: 'POST', body: data });
        const json = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) return setError(json.error ?? 'Application nahi ja payi');
        setDone(true);
      }}
    >
      <p className="eyebrow mb-3">Gaadi kaunsi hai</p>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {VEHICLES.map((v) => (
          <button
            key={v.value}
            type="button"
            aria-pressed={vehicleType === v.value}
            onClick={() => setVehicleType(v.value)}
            className="card card-hover p-4 text-left"
            style={vehicleType === v.value ? { borderColor: 'var(--laterite)', boxShadow: '0 0 0 2px var(--laterite)' } : undefined}
          >
            <div className="text-[26px]" aria-hidden>
              {v.emoji}
            </div>
            <div className="mt-1 text-[15px] font-semibold">{v.label}</div>
            <div className="mt-0.5 text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
              {v.note}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="name">Aapka naam</label>
          <input id="name" name="name" required placeholder="Jaise: Ravi Patil" />
        </div>
        <div className="field">
          <label htmlFor="phone">Mobile number</label>
          <input id="phone" name="phone" required inputMode="numeric" maxLength={10} placeholder="98765 43210" />
        </div>
        <div className="field">
          <label htmlFor="vehicleNumber">Gaadi ka number</label>
          <input id="vehicleNumber" name="vehicleNumber" required placeholder="MH 05 AB 1234" style={{ textTransform: 'uppercase' }} />
        </div>
        <div className="field">
          <label htmlFor="licenceNumber">Driving licence number</label>
          <input id="licenceNumber" name="licenceNumber" placeholder="Optional, verify mein madad karta hai" />
        </div>
        <div className="field">
          <label htmlFor="city">Sheher</label>
          <select id="city" name="city" defaultValue={CITIES[0]}>
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="area">Area / naka</label>
          <input id="area" name="area" required placeholder="Katrap Naka, Badlapur East" />
        </div>
      </div>

      <div className="field mt-4">
        <label htmlFor="photos">Gaadi aur licence ki photo</label>
        <input id="photos" name="photos" type="file" accept="image/*" multiple />
        <p className="mt-1.5 text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
          4 tak. Verify jaldi hota hai, lekin photo ke bina bhi bhej sakte hain.
        </p>
      </div>

      <p className="mt-5 rounded-lg px-4 py-3 text-[12.5px] leading-relaxed" style={{ background: 'var(--mist-deep)', color: 'var(--basalt)' }}>
        Aapka number sirf admin ko dikhega. Customer ko tabhi milega jab aap koi ride accept karenge.
      </p>

      {error && (
        <p className="mt-4 text-[13.5px]" style={{ color: 'var(--laterite)' }} role="alert">
          {error}
        </p>
      )}

      <button className="btn btn-primary mt-5" disabled={busy}>
        {busy ? 'Bheja ja raha hai…' : 'Register karo'}
      </button>
    </form>
  );
}
