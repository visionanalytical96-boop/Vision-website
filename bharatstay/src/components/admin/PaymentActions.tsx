'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function PaymentActions({ id }: { id: string }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function run(action: 'verify' | 'reject') {
    if (action === 'reject' && !note.trim()) {
      return setError('Reason likhiye — customer ko yahi dikhega');
    }
    setBusy(action);
    setError(null);
    const res = await fetch('/api/admin/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, note: note.trim() || undefined }),
    });
    setBusy(null);
    setConfirming(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return setError(json.error ?? 'Nahi ho paya');
    }
    router.refresh();
  }

  return (
    <div>
      <div className="field">
        <label htmlFor={`note-${id}`}>Reject karne ka reason</label>
        <input
          id={`note-${id}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Jaise: is UTR se koi paisa nahi mila"
        />
      </div>

      {error && (
        <p className="mt-3 text-[13px]" style={{ color: 'var(--laterite)' }} role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {confirming ? (
          <>
            <span className="text-[13.5px]" style={{ color: 'var(--basalt)' }}>
              Bank mein paisa dikh gaya?
            </span>
            <button className="btn btn-primary btn-sm" disabled={busy !== null} onClick={() => run('verify')}>
              {busy === 'verify' ? 'Confirm ho raha…' : 'Haan, confirm karo'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setConfirming(false)}>
              Abhi nahi
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-primary btn-sm" disabled={busy !== null} onClick={() => setConfirming(true)}>
              Payment mila — booking confirm karo
            </button>
            <button className="btn btn-secondary btn-sm" disabled={busy !== null} onClick={() => run('reject')}>
              Nahi mila — reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}
