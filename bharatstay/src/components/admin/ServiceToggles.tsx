'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Service = { key: string; label: string; enabled: boolean };

export function ServiceToggles({ services }: { services: Service[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(body: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    const res = await fetch('/api/admin/site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setBusy(null);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? 'Nahi ho paya');
      return false;
    }
    router.refresh();
    return true;
  }

  const toggle = (key: string, enabled: boolean) => send({ kind: 'service', key, enabled }, key);

  return (
    <>
    <form
      className="card mt-7 flex flex-wrap items-end gap-3 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const key = (form.elements.namedItem('key') as HTMLInputElement).value.trim().toLowerCase();
        const label = (form.elements.namedItem('label') as HTMLInputElement).value.trim();
        if (await send({ kind: 'service.create', key, label }, 'new')) form.reset();
      }}
    >
      <div className="field" style={{ minWidth: '150px' }}>
        <label htmlFor="new-key">Nayi service ki key</label>
        <input id="new-key" name="key" placeholder="jaise: tours" required />
      </div>
      <div className="field flex-1" style={{ minWidth: '200px' }}>
        <label htmlFor="new-label">Naam</label>
        <input id="new-label" name="label" placeholder="Jaise: Guided Tours" required />
      </div>
      <button className="btn btn-primary btn-sm" disabled={busy !== null}>+ Service jodo</button>
    </form>

    {error && (
      <p className="mt-3 text-[13px]" style={{ color: 'var(--laterite)' }} role="alert">
        {error}
      </p>
    )}

    <ul className="card mt-4 divide-y overflow-hidden">
      {services.map((s) => (
        <li key={s.key} className="flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <div className="text-[15px] font-medium">{s.label}</div>
            <div className="data text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
              /{s.key}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {confirming === s.key ? (
              <>
                <button className="btn btn-primary btn-sm" disabled={busy !== null}
                  onClick={async () => { await send({ kind: 'service.delete', key: s.key }, s.key); setConfirming(null); }}>
                  Pakka hatao
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setConfirming(null)}>Nahi</button>
              </>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={() => setConfirming(s.key)}>Hatao</button>
            )}

            <button
              type="button"
              role="switch"
              aria-checked={s.enabled}
              aria-label={`${s.label} ${s.enabled ? 'band karo' : 'chalu karo'}`}
              disabled={busy === s.key}
              onClick={() => toggle(s.key, !s.enabled)}
              className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
              style={{ background: s.enabled ? 'var(--monsoon)' : 'var(--mist-deep)' }}
            >
              <span
                className="absolute top-1 h-5 w-5 rounded-full transition-all"
                style={{ background: 'var(--paper)', left: s.enabled ? '26px' : '4px' }}
              />
            </button>
          </div>
        </li>
      ))}
    </ul>
    </>
  );
}
