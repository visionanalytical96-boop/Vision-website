'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Service = { key: string; label: string; enabled: boolean };

export function ServiceToggles({ services }: { services: Service[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(key: string, enabled: boolean) {
    setBusy(key);
    await fetch('/api/admin/site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'service', key, enabled }),
    });
    setBusy(null);
    router.refresh();
  }

  return (
    <ul className="card mt-7 divide-y overflow-hidden">
      {services.map((s) => (
        <li key={s.key} className="flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <div className="text-[15px] font-medium">{s.label}</div>
            <div className="data text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
              /{s.key}
            </div>
          </div>
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
        </li>
      ))}
    </ul>
  );
}
