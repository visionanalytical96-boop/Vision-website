'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Fare = {
  vehicleType: string;
  label: string;
  baseFare: number;
  perKm: number;
  minFare: number;
  matchRadiusKm: number;
  enabled: boolean;
};

const EMOJI: Record<string, string> = { BIKE: '🏍️', EBIKE: '⚡', AUTO: '🛺' };

export function FareEditor({ fares }: { fares: Fare[] }) {
  const router = useRouter();
  const [saved, setSaved] = useState<string | null>(null);

  return (
    <section className="mt-8">
      <h2 className="text-[18px] font-semibold">Kiraya</h2>
      <p className="mt-1 max-w-[62ch] text-[13.5px]" style={{ color: 'var(--basalt)' }}>
        Har gaadi ka base fare, per-km rate aur minimum yahan se badlo. Match radius tay karta hai ki kitni door
        tak ke rider ko request bheji jaye. Save karte hi naya rate lag jaata hai.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {fares.map((f) => (
          <form
            key={f.vehicleType}
            className="card p-5"
            onSubmit={async (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const res = await fetch('/api/admin/riders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  kind: 'fare',
                  vehicleType: f.vehicleType,
                  baseFare: Number(data.get('baseFare')),
                  perKm: Number(data.get('perKm')),
                  minFare: Number(data.get('minFare')),
                  matchRadiusKm: Number(data.get('matchRadiusKm')),
                  enabled: data.get('enabled') === 'on',
                }),
              });
              if (res.ok) {
                setSaved(f.vehicleType);
                router.refresh();
                setTimeout(() => setSaved(null), 2500);
              } else {
                const json = await res.json().catch(() => ({}));
                alert(json.error ?? 'Save nahi hua');
              }
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-[22px]" aria-hidden>{EMOJI[f.vehicleType]}</span>
              <h3 className="text-[16px] font-semibold">{f.label}</h3>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="field">
                <label htmlFor={`b-${f.vehicleType}`}>Base (₹)</label>
                <input id={`b-${f.vehicleType}`} name="baseFare" type="number" defaultValue={f.baseFare} required />
              </div>
              <div className="field">
                <label htmlFor={`k-${f.vehicleType}`}>Per km (₹)</label>
                <input id={`k-${f.vehicleType}`} name="perKm" type="number" defaultValue={f.perKm} required />
              </div>
              <div className="field">
                <label htmlFor={`m-${f.vehicleType}`}>Minimum (₹)</label>
                <input id={`m-${f.vehicleType}`} name="minFare" type="number" defaultValue={f.minFare} required />
              </div>
              <div className="field">
                <label htmlFor={`r-${f.vehicleType}`}>Radius (km)</label>
                <input id={`r-${f.vehicleType}`} name="matchRadiusKm" type="number" step="0.5" defaultValue={f.matchRadiusKm} required />
              </div>
            </div>

            <label className="mt-3 flex items-center gap-2 text-[13.5px]">
              <input type="checkbox" name="enabled" defaultChecked={f.enabled} />
              Yeh gaadi book ho sakti hai
            </label>

            <button className="btn btn-primary btn-sm mt-4">
              {saved === f.vehicleType ? 'Save ho gaya ✓' : 'Save karo'}
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}
