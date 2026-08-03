'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { StayEditor, type StayRow } from './StayEditor';
import { INR } from '@/lib/format';

const TYPE_LABEL: Record<string, string> = {
  FARM_STAY: 'Farmhouse', VILLA: 'Villa', HOMESTAY: 'Homestay', RESORT: 'Resort', HOTEL: 'Hotel',
};

export function StayTable({ stays }: { stays: StayRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<StayRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);

  const filtered = q.trim()
    ? stays.filter((s) => `${s.name} ${s.city} ${s.area}`.toLowerCase().includes(q.trim().toLowerCase()))
    : stays;

  async function remove(id: string) {
    await fetch('/api/admin/stays', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setConfirming(null);
    router.refresh();
  }

  return (
    <div>
      <div className="mt-6 flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Naam, sheher ya area se dhoondo"
          className="flex-1 rounded-lg border px-4 py-2.5 text-[14px] outline-none"
          style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--surface-ink)', minWidth: '220px' }}
        />
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            setAdding(true);
            setEditing(null);
          }}
        >
          + Naya stay
        </button>
      </div>

      {(adding || editing) && (
        <StayEditor
          stay={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
        />
      )}

      <div className="card scroll-x mt-5">
        <table className="w-full text-[13.5px]" style={{ minWidth: '820px' }}>
          <thead>
            <tr className="border-b text-left" style={{ color: 'var(--basalt-soft)' }}>
              {['Naam', 'Type', 'Sheher', 'Price', 'Rating', 'Photos', 'Live', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-[11.5px] font-medium uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
                    {s.area}
                  </div>
                </td>
                <td className="px-4 py-3">{TYPE_LABEL[s.type] ?? s.type}</td>
                <td className="px-4 py-3">{s.city}</td>
                <td className="data px-4 py-3">{INR(s.price)}</td>
                <td className="data px-4 py-3">{s.rating.toFixed(1)}</td>
                <td className="data px-4 py-3">{s.photoCount || '—'}</td>
                <td className="px-4 py-3">
                  <span className="chip text-[11px]" style={s.visible ? undefined : { opacity: 0.55 }}>
                    {s.visible ? 'Live' : 'Chhupa'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setEditing(s);
                        setAdding(false);
                      }}
                    >
                      Edit
                    </button>
                    {confirming === s.id ? (
                      <>
                        <button className="btn btn-primary btn-sm" onClick={() => remove(s.id)}>
                          Pakka hatao
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setConfirming(null)}>
                          Nahi
                        </button>
                      </>
                    ) : (
                      <button className="btn btn-secondary btn-sm" onClick={() => setConfirming(s.id)}>
                        Hatao
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="mt-5 text-center text-[14px]" style={{ color: 'var(--basalt-soft)' }}>
          &ldquo;{q}&rdquo; se koi stay nahi mila.
        </p>
      )}
    </div>
  );
}
