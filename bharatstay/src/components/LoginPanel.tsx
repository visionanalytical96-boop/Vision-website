'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type Tab = 'customer' | 'admin';

export function LoginPanel({ initialTab = 'customer', next }: { initialTab?: Tab; next?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <div className="mb-6 flex gap-2">
        {(
          [
            ['customer', 'Customer'],
            ['admin', 'Admin'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`chip ${tab === value ? 'chip-on' : ''}`}
            onClick={() => {
              setTab(value);
              setError(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <h1 className="display text-[clamp(26px,5vw,38px)]">{tab === 'admin' ? 'Admin login' : 'Welcome back'}</h1>
      <p className="mt-2 text-[14px] leading-relaxed" style={{ color: 'var(--basalt)' }}>
        {tab === 'admin'
          ? 'Listings, prices aur applications manage karne ke liye.'
          : 'Mobile number par code aayega. Naya number ho to account apne aap ban jayega.'}
      </p>

      {error && (
        <p
          className="mt-5 rounded-lg px-4 py-3 text-[13.5px]"
          style={{ background: 'color-mix(in srgb, var(--laterite) 12%, transparent)', color: 'var(--laterite)' }}
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="mt-6">
        {tab === 'admin' ? (
          <AdminForm busy={busy} setBusy={setBusy} setError={setError} onDone={() => router.replace(next || '/admin')} />
        ) : (
          <OtpForm busy={busy} setBusy={setBusy} setError={setError} onDone={() => router.replace(next || '/dashboard')} />
        )}
      </div>
    </div>
  );
}

type FormProps = {
  busy: boolean;
  setBusy: (b: boolean) => void;
  setError: (e: string | null) => void;
  onDone: () => void;
};

function AdminForm({ busy, setBusy, setError, onDone }: FormProps) {
  const router = useRouter();
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setBusy(true);
        setError(null);
        const res = await fetch('/api/auth/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email.value, password: form.password.value }),
        });
        const json = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) return setError(json.error ?? 'Login nahi hua');
        router.refresh();
        onDone();
      }}
    >
      <div className="field">
        <label htmlFor="email">Admin email</label>
        <input id="email" name="email" type="email" required autoComplete="username" placeholder="admin@bharatstay.in" />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••" />
      </div>
      <button className="btn btn-primary" disabled={busy}>
        {busy ? 'Checking…' : 'Admin panel kholo'}
      </button>
    </form>
  );
}

function OtpForm({ busy, setBusy, setError, onDone }: FormProps) {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  async function send() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/auth/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', phone }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? 'Code nahi bheja ja saka');
    setSent(true);
    setDevCode(json.devCode ?? null);
    setExpiresAt(new Date(json.expiresAt).getTime());
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!sent) return send();
        const code = (e.currentTarget.elements.namedItem('code') as HTMLInputElement).value;
        setBusy(true);
        setError(null);
        const res = await fetch('/api/auth/otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', phone, code, name }),
        });
        const json = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) return setError(json.error ?? 'Code galat hai');
        router.refresh();
        onDone();
      }}
    >
      <div className="field">
        <label htmlFor="name">Aapka naam (optional)</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jaise: Ravi Patil" />
      </div>

      <div className="field">
        <label htmlFor="phone">Mobile number</label>
        <div className="flex gap-2">
          <span
            className="data flex items-center rounded-lg border px-3 text-[14px]"
            style={{ borderColor: 'var(--line)', color: 'var(--basalt)' }}
          >
            +91
          </span>
          <input
            id="phone"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            readOnly={sent}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="98765 43210"
            required
          />
        </div>
      </div>

      {sent && (
        <>
          {devCode && (
            <div
              className="rounded-xl border px-4 py-3 text-center"
              style={{ borderStyle: 'dashed', borderColor: 'var(--monsoon)' }}
            >
              <div className="eyebrow" style={{ color: 'var(--monsoon)' }}>
                Demo code
              </div>
              <div className="data mt-1 text-[26px] font-medium tracking-[0.3em]">{devCode}</div>
              <p className="mt-1 text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
                SMS provider abhi connect nahi hai, isliye code yahin dikha rahe hain.
              </p>
            </div>
          )}

          <div className="field">
            <label htmlFor="code">Code {left > 0 ? `(${left}s baaki)` : '(expire ho gaya)'}</label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              maxLength={6}
              required
              placeholder="••••••"
              className="text-center"
              style={{ letterSpacing: '0.4em' }}
            />
          </div>
        </>
      )}

      <button className="btn btn-primary" disabled={busy}>
        {busy ? 'Ek second…' : sent ? 'Verify karke log in' : 'Code bhejo'}
      </button>

      {sent && (
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={send}>
          Naya code bhejo
        </button>
      )}
    </form>
  );
}
