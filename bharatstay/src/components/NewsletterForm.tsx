'use client';

import { useState } from 'react';

/** Footer email capture. Signing up twice is fine — the API upserts. */
export function NewsletterForm() {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (state === 'done') {
    return (
      <p className="mt-3 text-[13.5px]" data-testid="newsletter-done">
        Ho gaya — nayi jagahein aapke inbox mein aayengi.
      </p>
    );
  }

  return (
    <form
      className="mt-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const email = String(new FormData(e.currentTarget).get('email') ?? '');
        setState('busy');
        setError(null);
        try {
          const res = await fetch('/api/newsletter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            setState('idle');
            return setError(json.error ?? 'Nahi ho paya — dobara koshish kijiye');
          }
          setState('done');
        } catch {
          setState('idle');
          setError('Network problem — dobara koshish kijiye');
        }
      }}
    >
      <div className="flex gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="aapka@email.com"
          aria-label="Email for newsletter"
          data-testid="newsletter-email"
          className="min-w-0 flex-1 rounded-lg px-3 py-2 text-[13.5px]"
          style={{ background: 'var(--surface)', color: 'var(--surface-ink)', border: '1px solid var(--line)' }}
        />
        <button className="btn btn-primary btn-sm shrink-0" type="submit" disabled={state === 'busy'}>
          {state === 'busy' ? '…' : 'Jodo'}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-[12.5px]" style={{ color: 'var(--turmeric)' }} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
