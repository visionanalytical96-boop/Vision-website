'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ApplicationActions({
  id,
  kind,
  defaultPrice,
}: {
  id: string;
  kind: 'STAY' | 'RESTAURANT';
  defaultPrice: number;
}) {
  const router = useRouter();
  const [price, setPrice] = useState(String(defaultPrice || ''));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: 'approve' | 'reject' | 'needs_info') {
    if (action !== 'approve' && !note.trim()) {
      setError('Reason likhiye — owner ko yahi dikhega');
      return;
    }
    setBusy(action);
    setError(null);
    const res = await fetch('/api/admin/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, note: note.trim() || undefined, price: price ? Number(price) : undefined }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setError(json.error ?? 'Kuch galat ho gaya');
    router.refresh();
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <div className="field">
          <label htmlFor={`price-${id}`}>{kind === 'STAY' ? 'Per night (₹)' : 'For two (₹)'}</label>
          <input
            id={`price-${id}`}
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="3500"
          />
        </div>
        <div className="field">
          <label htmlFor={`note-${id}`}>Note (reject / info maangne par zaroori)</label>
          <input
            id={`note-${id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Owner ko yeh message dikhega"
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 text-[13px]" style={{ color: 'var(--laterite)' }} role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn btn-primary btn-sm" disabled={busy !== null} onClick={() => run('approve')}>
          {busy === 'approve' ? 'Live kar rahe hain…' : 'Approve karke live karo'}
        </button>
        <button className="btn btn-secondary btn-sm" disabled={busy !== null} onClick={() => run('needs_info')}>
          Aur jaankari maango
        </button>
        <button className="btn btn-secondary btn-sm" disabled={busy !== null} onClick={() => run('reject')}>
          Reject
        </button>
      </div>
    </div>
  );
}
