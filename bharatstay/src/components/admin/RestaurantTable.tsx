'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { INR } from '@/lib/format';

export type RestaurantRow = {
  id: string;
  name: string;
  city: string;
  area: string;
  cuisine: string;
  vegType: string;
  hours: string;
  emoji: string;
  tone: string;
  costForTwo: number;
  rating: number;
  visible: boolean;
  photoCount: number;
};

const VEG = ['Pure Veg', 'Veg & Non-veg', 'Non-veg Special', 'Seafood Special'];
const TONES = ['saffron', 'forest', 'ocean', 'mountain', 'farm', 'lake', 'heritage', 'royal', 'gold', 'desert'];

export function RestaurantTable({ rows }: { rows: RestaurantRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<RestaurantRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);

  const filtered = q.trim()
    ? rows.filter((r) => `${r.name} ${r.city} ${r.area} ${r.cuisine}`.toLowerCase().includes(q.trim().toLowerCase()))
    : rows;

  async function remove(id: string) {
    await fetch('/api/admin/restaurants', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setConfirming(null);
    router.refresh();
  }

  const current = editing;

  return (
    <div>
      <div className="mt-6 flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Naam, sheher ya cuisine se dhoondo"
          className="flex-1 rounded-lg border px-4 py-2.5 text-[14px] outline-none"
          style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--surface-ink)', minWidth: '220px' }}
        />
        <button className="btn btn-primary btn-sm" onClick={() => { setAdding(true); setEditing(null); }}>
          + Naya restaurant
        </button>
      </div>

      {(adding || current) && (
        <div className="card mt-4 p-5">
          <h3 className="text-[16px] font-semibold">{current ? `${current.name} edit karo` : 'Naya restaurant add karo'}</h3>
          <form
            className="mt-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              if (current) data.set('id', current.id);
              const res = await fetch('/api/admin/restaurants', { method: 'POST', body: data });
              if (res.ok) {
                router.refresh();
                setAdding(false);
                setEditing(null);
              } else {
                const json = await res.json().catch(() => ({}));
                alert(json.error ?? 'Save nahi hua');
              }
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <TextField name="name" label="Naam" defaultValue={current?.name} required />
              <TextField name="city" label="Sheher" defaultValue={current?.city} required />
              <TextField name="area" label="Area / naka" defaultValue={current?.area} required />
              <TextField name="cuisine" label="Cuisine" defaultValue={current?.cuisine ?? 'Maharashtrian'} required />
              <TextField name="hours" label="Timings" defaultValue={current?.hours ?? '11:00 AM – 11:00 PM'} required />
              <TextField name="costForTwo" label="Do logon ka kharcha (₹)" type="number" defaultValue={current?.costForTwo} required />
              <TextField name="rating" label="Rating" type="number" step="0.1" defaultValue={current?.rating ?? 4} />
              <TextField name="emoji" label="Emoji" defaultValue={current?.emoji ?? '🍽️'} />
              <div className="field">
                <label htmlFor="vegType">Veg / Non-veg</label>
                <select id="vegType" name="vegType" defaultValue={current?.vegType ?? VEG[0]}>
                  {VEG.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="tone">Scene colour</label>
                <select id="tone" name="tone" defaultValue={current?.tone ?? 'saffron'}>
                  {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="photos">Photos jodo</label>
                <input id="photos" name="photos" type="file" accept="image/*" multiple />
              </div>
            </div>

            <label className="mt-4 flex items-center gap-2 text-[14px]">
              <input type="checkbox" name="visible" defaultChecked={current?.visible ?? true} />
              Site par dikhao
            </label>

            <div className="mt-5 flex gap-2">
              <button className="btn btn-primary btn-sm">Save karo</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setAdding(false); setEditing(null); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card scroll-x mt-5">
        <table className="w-full text-[13.5px]" style={{ minWidth: '820px' }}>
          <thead>
            <tr className="border-b text-left" style={{ color: 'var(--basalt-soft)' }}>
              {['Naam', 'Cuisine', 'Sheher', 'For two', 'Rating', 'Photos', 'Live', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-[11.5px] font-medium uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <div className="font-medium">{r.emoji} {r.name}</div>
                  <div className="text-[12px]" style={{ color: 'var(--basalt-soft)' }}>{r.area}</div>
                </td>
                <td className="px-4 py-3">{r.cuisine}</td>
                <td className="px-4 py-3">{r.city}</td>
                <td className="data px-4 py-3">{INR(r.costForTwo)}</td>
                <td className="data px-4 py-3">{r.rating.toFixed(1)}</td>
                <td className="data px-4 py-3">{r.photoCount || '—'}</td>
                <td className="px-4 py-3">
                  <span className="chip text-[11px]" style={r.visible ? undefined : { opacity: 0.55 }}>
                    {r.visible ? 'Live' : 'Chhupa'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(r); setAdding(false); }}>
                      Edit
                    </button>
                    {confirming === r.id ? (
                      <>
                        <button className="btn btn-primary btn-sm" onClick={() => remove(r.id)}>Pakka hatao</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setConfirming(null)}>Nahi</button>
                      </>
                    ) : (
                      <button className="btn btn-secondary btn-sm" onClick={() => setConfirming(r.id)}>Hatao</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TextField({
  name, label, defaultValue, type = 'text', required = false, step,
}: {
  name: string; label: string; defaultValue?: string | number; type?: string; required?: boolean; step?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} step={step} defaultValue={defaultValue} required={required} />
    </div>
  );
}
