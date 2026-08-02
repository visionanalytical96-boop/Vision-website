'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function RiderActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: 'approve' | 'reject' | 'suspend' | 'reinstate') {
    if ((action === 'reject' || action === 'suspend') && !note.trim()) {
      return setError('Reason likhiye — rider ko yahi dikhega');
    }
    setBusy(action);
    setError(null);
    const res = await fetch('/api/admin/riders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'rider', id, action, note: note.trim() || undefined }),
    });
    setBusy(null);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return setError(json.error ?? 'Nahi ho paya');
    }
    setNote('');
    router.refresh();
  }

  return (
    <div>
      <div className="field">
        <label htmlFor={`note-${id}`}>Note (reject / suspend par zaroori)</label>
        <input
          id={`note-${id}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Rider ko yeh message dikhega"
        />
      </div>

      {error && (
        <p className="mt-3 text-[13px]" style={{ color: 'var(--laterite)' }} role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {status === 'PENDING' && (
          <>
            <button className="btn btn-primary btn-sm" disabled={busy !== null} onClick={() => run('approve')}>
              {busy === 'approve' ? 'Approve ho raha…' : 'Approve karo'}
            </button>
            <button className="btn btn-secondary btn-sm" disabled={busy !== null} onClick={() => run('reject')}>
              Reject
            </button>
          </>
        )}
        {status === 'APPROVED' && (
          <button className="btn btn-secondary btn-sm" disabled={busy !== null} onClick={() => run('suspend')}>
            Suspend karo
          </button>
        )}
        {(status === 'SUSPENDED' || status === 'REJECTED') && (
          <button className="btn btn-primary btn-sm" disabled={busy !== null} onClick={() => run('reinstate')}>
            Wapas chalu karo
          </button>
        )}
      </div>
    </div>
  );
}
