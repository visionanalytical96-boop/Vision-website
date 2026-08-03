'use client';

import { useState } from 'react';

export function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="card p-10 text-center" data-testid="contact-sent">
        <p className="text-[17px] font-semibold">Message pahunch gaya</p>
        <p className="mt-2 text-[14px]" style={{ color: 'var(--basalt-soft)' }}>
          Hum aapke email par jawab denge. Jaldi baat karni ho to phone par call kar lijiye.
        </p>
        <button className="btn btn-secondary mt-6" type="button" onClick={() => setSent(false)}>
          Ek aur message bhejiye
        </button>
      </div>
    );
  }

  return (
    <form
      className="card p-6 sm:p-7"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);

        const data = Object.fromEntries(new FormData(e.currentTarget));
        try {
          const res = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          const json = await res.json().catch(() => ({}));
          setBusy(false);
          if (!res.ok) return setError(json.error ?? 'Message nahi ja paya — dobara koshish kijiye');
          setSent(true);
        } catch {
          setBusy(false);
          setError('Network problem — dobara koshish kijiye');
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="name">Aapka naam</label>
          <input id="name" name="name" required minLength={2} placeholder="Jaise: Ravi Patil" />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required placeholder="aap@example.com" />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone (optional)</label>
          <input id="phone" name="phone" type="tel" placeholder="98765 43210" />
        </div>
        <div className="field">
          <label htmlFor="subject">Vishay</label>
          <input id="subject" name="subject" required minLength={3} placeholder="Booking, listing ya kuch aur" />
        </div>
      </div>

      <div className="field mt-4">
        <label htmlFor="body">Message</label>
        <textarea id="body" name="body" required minLength={10} rows={6} placeholder="Kya poochna hai, thoda vistaar se likhiye…" />
      </div>

      {error && (
        <p className="mt-4 text-[13.5px]" style={{ color: 'var(--laterite)' }} role="alert">
          {error}
        </p>
      )}

      <button className="btn btn-primary mt-5" type="submit" disabled={busy}>
        {busy ? 'Bhej rahe hain…' : 'Message bhejiye'}
      </button>
    </form>
  );
}
