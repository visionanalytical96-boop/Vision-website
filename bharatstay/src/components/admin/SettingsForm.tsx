'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const FIELDS: { key: string; label: string; hint?: string; long?: boolean }[] = [
  { key: 'brandA', label: 'Brand — pehla hissa', hint: 'Jaise: Bharat' },
  { key: 'brandB', label: 'Brand — doosra hissa', hint: 'Jaise: Stay (yeh rang mein dikhta hai)' },
  { key: 'tagline', label: 'Tagline', hint: 'Footer mein dikhta hai' },
  { key: 'heroTitle', label: 'Home page ka bada heading' },
  { key: 'heroSubtitle', label: 'Home page ki neeche wali line', long: true },
  { key: 'upiId', label: 'Aapka UPI ID', hint: 'Jaise: 9876543210@okhdfcbank — yahin par customer ka paisa aayega' },
  { key: 'upiName', label: 'UPI par naam', hint: 'Customer ko payment screen par yeh naam dikhega' },
  { key: 'supportEmail', label: 'Support email' },
  { key: 'supportPhone', label: 'Support phone (contact page par dikhega)' },
  { key: 'city', label: 'Sheher', hint: 'Footer mein address ke jagah' },
  { key: 'gstin', label: 'GSTIN', hint: 'Khaali chhodo to receipt par nahi aayega' },
  { key: 'dataNotice', label: 'Footer ka disclaimer', long: true },
  { key: 'adminNotes', label: 'Aapke apne notes', hint: 'Sirf admin panel mein dikhta hai, site par nahi', long: true },
];

export function SettingsForm({ settings }: { settings: Record<string, string> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-7"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        setSaved(false);
        const data = new FormData(e.currentTarget);
        const values = Object.fromEntries(
          FIELDS.map((f) => [f.key, String(data.get(f.key) ?? '')]),
        );
        const res = await fetch('/api/admin/site', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'settings', values }),
        });
        setBusy(false);
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          return setError(json.error ?? 'Save nahi hua');
        }
        setSaved(true);
        router.refresh();
      }}
    >
      <div className="card divide-y overflow-hidden">
        {FIELDS.map((f) => (
          <div key={f.key} className="field px-5 py-4">
            <label htmlFor={f.key}>{f.label}</label>
            {f.long ? (
              <textarea id={f.key} name={f.key} rows={2} defaultValue={settings[f.key] ?? ''} />
            ) : (
              <input id={f.key} name={f.key} defaultValue={settings[f.key] ?? ''} />
            )}
            {f.hint && (
              <p className="mt-1.5 text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
                {f.hint}
              </p>
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-4 text-[13.5px]" style={{ color: 'var(--laterite)' }} role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="mt-4 text-[13.5px]" style={{ color: 'var(--monsoon)' }} role="status">
          Save ho gaya — site par dikhne laga.
        </p>
      )}

      <button className="btn btn-primary mt-5" disabled={busy}>
        {busy ? 'Save ho raha hai…' : 'Settings save karo'}
      </button>
    </form>
  );
}
