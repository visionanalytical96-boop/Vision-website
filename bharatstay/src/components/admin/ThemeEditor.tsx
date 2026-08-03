'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Field = {
  key: string;
  label: string;
  hint: string;
  unit: string;
  type: 'range' | 'color' | 'hex';
  min?: number;
  max?: number;
  step?: number;
  value: string;
  fallback: string;
};

const CSS_VAR: Record<string, string> = {
  glassBlur: '--glass-blur',
  glassAlpha: '--glass-alpha',
  glassBorder: '--glass-border',
  glassRadius: '--glass-radius',
  glassFloat: '--glass-float',
  glassTint: '--glass-tint',
  glassBgFrom: '--glass-bg-from',
  glassBgTo: '--glass-bg-to',
  glassAccent: '--glass-accent',
};

const hexToRgbTriplet = (hex: string) => {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim());
  return m ? `${parseInt(m[1]!, 16)} ${parseInt(m[2]!, 16)} ${parseInt(m[3]!, 16)}` : '255 255 255';
};

const tripletToHex = (t: string) => {
  const [r, g, b] = t.trim().split(/\s+/).map((n) => Number(n) || 0);
  return '#' + [r, g, b].map((n) => Math.max(0, Math.min(255, n ?? 0)).toString(16).padStart(2, '0')).join('');
};

const PRESETS: { name: string; values: Record<string, string> }[] = [
  { name: 'Frosted (default)', values: { glassBlur: '18', glassAlpha: '0.55', glassBorder: '0.22', glassRadius: '20', glassFloat: '1', glassTint: '255 255 255', glassBgFrom: '#0d1f1a', glassBgTo: '#16352c', glassAccent: '#e0a426' } },
  { name: 'Clear glass', values: { glassBlur: '30', glassAlpha: '0.2', glassBorder: '0.32', glassRadius: '26', glassFloat: '1.3', glassTint: '255 255 255', glassBgFrom: '#0a1a24', glassBgTo: '#10303f', glassAccent: '#4fb0d8' } },
  { name: 'Cinema (Netflix-ish)', values: { glassBlur: '14', glassAlpha: '0.42', glassBorder: '0.14', glassRadius: '10', glassFloat: '1.4', glassTint: '20 20 24', glassBgFrom: '#0a0a0c', glassBgTo: '#1a1013', glassAccent: '#e50914' } },
  { name: 'Solid (no glass)', values: { glassBlur: '0', glassAlpha: '0.94', glassBorder: '0.1', glassRadius: '14', glassFloat: '0', glassTint: '18 33 28', glassBgFrom: '#0d1f1a', glassBgTo: '#122a23', glassAccent: '#1f6f5c' } },
];

export function ThemeEditor({ fields }: { fields: Field[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, f.value])),
  );
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k: string, v: string) => {
    setValues((prev) => ({ ...prev, [k]: v }));
    setSaved(false);
    // Paint the live page as the slider moves, so the preview is the real
    // thing rather than a mock-up of it.
    const cssVar = CSS_VAR[k];
    const field = fields.find((f) => f.key === k);
    if (cssVar) document.documentElement.style.setProperty(cssVar, field?.unit ? `${v}${field.unit}` : v);
  };

  function applyPreset(preset: Record<string, string>) {
    for (const [k, v] of Object.entries(preset)) set(k, v);
  }

  return (
    <div className="mt-8">
      <p className="eyebrow mb-3">Ready looks</p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.name} type="button" className="chip" onClick={() => applyPreset(p.values)}>
            {p.name}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        <form
          className="card p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const res = await fetch('/api/admin/site', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ kind: 'settings', values }),
            });
            setBusy(false);
            if (res.ok) {
              setSaved(true);
              router.refresh();
            } else {
              const json = await res.json().catch(() => ({}));
              alert(json.error ?? 'Save nahi hua');
            }
          }}
        >
          {fields.map((f) => (
            <div key={f.key} className="mb-5">
              <label htmlFor={f.key} className="flex items-baseline justify-between gap-3 text-[13.5px] font-semibold">
                <span>{f.label}</span>
                <span className="data text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
                  {f.type === 'range' ? `${values[f.key]}${f.unit}` : values[f.key]}
                </span>
              </label>

              {f.type === 'range' && (
                <input
                  id={f.key}
                  type="range"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={values[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="mt-2 w-full"
                />
              )}

              {f.type === 'hex' && (
                <input
                  id={f.key}
                  type="color"
                  value={values[f.key] ?? f.fallback}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="mt-2 h-10 w-full cursor-pointer rounded-lg border"
                  style={{ borderColor: 'var(--line)', background: 'transparent' }}
                />
              )}

              {f.type === 'color' && (
                <input
                  id={f.key}
                  type="color"
                  value={tripletToHex(values[f.key] ?? f.fallback)}
                  onChange={(e) => set(f.key, hexToRgbTriplet(e.target.value))}
                  className="mt-2 h-10 w-full cursor-pointer rounded-lg border"
                  style={{ borderColor: 'var(--line)', background: 'transparent' }}
                />
              )}

              {f.hint && (
                <p className="mt-1 text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
                  {f.hint}
                </p>
              )}
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Save ho raha hai…' : saved ? 'Save ho gaya ✓' : 'Theme save karo'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => applyPreset(Object.fromEntries(fields.map((f) => [f.key, f.fallback])))}
            >
              Default par wapas
            </button>
          </div>
        </form>

        <div className="lg:sticky lg:top-24">
          <p className="eyebrow mb-3">Preview</p>
          <div className="card glass-float p-6">
            <p className="eyebrow">Badlapur → Karjat</p>
            <h3 className="display mt-2 text-[26px]">Kondeshwar Farm Stay</h3>
            <p className="mt-2 text-[13.5px]" style={{ color: 'var(--basalt)' }}>
              Kondeshwar Road, Badlapur East
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip">Free cancellation</span>
              <span className="chip chip-on">Farmhouse</span>
            </div>
            <div className="mt-5 flex items-center justify-between border-t pt-4">
              <span className="data text-[20px] font-medium">₹3,240</span>
              <button type="button" className="btn btn-primary btn-sm">
                Book karo
              </button>
            </div>
          </div>

          <div className="card mt-4 p-5">
            <div className="field">
              <label htmlFor="preview-input">Form ka look</label>
              <input id="preview-input" placeholder="Yahan type karke dekho" />
            </div>
          </div>

          <p className="mt-4 text-[12.5px]" style={{ color: 'var(--basalt-soft)' }}>
            Slider hilate hi poora admin panel bhi badal raha hai — yahi asli site par dikhega.
          </p>
        </div>
      </div>
    </div>
  );
}
