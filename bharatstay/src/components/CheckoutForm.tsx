'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Rail } from './Rail';
import { INR } from '@/lib/format';

const STEPS = ['Dates', 'Guest', 'GST', 'Confirm'];

export function CheckoutForm({
  staySlug,
  price,
  taxPct,
  defaults,
}: {
  staySlug: string;
  price: number;
  taxPct: number;
  defaults: { checkIn: string; checkOut: string; guests: number; rooms: number; name: string; phone: string };
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wantGst, setWantGst] = useState(false);

  const [form, setForm] = useState({
    checkIn: defaults.checkIn || new Date().toISOString().slice(0, 10),
    checkOut: defaults.checkOut || new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    guests: defaults.guests || 2,
    rooms: defaults.rooms || 1,
    guestName: defaults.name,
    guestEmail: '',
    guestPhone: defaults.phone.replace(/\D/g, '').slice(-10),
    gstin: '',
    gstCompany: '',
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const nights = Math.max(
    1,
    Math.round((new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / 86_400_000) || 1,
  );
  const base = price * nights * form.rooms;
  const taxes = Math.round((base * taxPct) / 100);
  const total = base + taxes;

  function validate(): string | null {
    if (step === 0) {
      if (new Date(form.checkOut) <= new Date(form.checkIn)) return 'Check-out check-in ke baad hona chahiye';
    }
    if (step === 1) {
      if (form.guestName.trim().length < 2) return 'Naam daaliye';
      if (!/^\S+@\S+\.\S+$/.test(form.guestEmail)) return 'Sahi email daaliye';
      if (form.guestPhone.replace(/\D/g, '').length < 10) return '10 digit ka phone daaliye';
    }
    if (step === 2 && wantGst) {
      if (form.gstin.trim().length < 10) return 'GSTIN daaliye ya GST option band karo';
      if (form.gstCompany.trim().length < 2) return 'Company ka naam daaliye';
    }
    return null;
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staySlug,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        guests: form.guests,
        rooms: form.rooms,
        guestName: form.guestName,
        guestEmail: form.guestEmail,
        guestPhone: form.guestPhone,
        ...(wantGst ? { gstin: form.gstin, gstCompany: form.gstCompany } : {}),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? 'Booking nahi ho payi');
    router.push(`/booking/${json.ref}`);
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <div>
        <div className="card p-5">
          <Rail stops={STEPS.map((label, i) => ({ label, note: `0${i + 1}`, done: i < step, current: i === step }))} />
        </div>

        <div className="card mt-5 p-6">
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="field">
                <label htmlFor="ci">Check-in</label>
                <input id="ci" type="date" value={form.checkIn} onChange={(e) => set('checkIn', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="co">Check-out</label>
                <input id="co" type="date" value={form.checkOut} min={form.checkIn} onChange={(e) => set('checkOut', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="g">Guests</label>
                <input id="g" type="number" min={1} value={form.guests} onChange={(e) => set('guests', Math.max(1, Number(e.target.value)))} />
              </div>
              <div className="field">
                <label htmlFor="r">Rooms</label>
                <input id="r" type="number" min={1} value={form.rooms} onChange={(e) => set('rooms', Math.max(1, Number(e.target.value)))} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="field sm:col-span-2">
                <label htmlFor="n">Poora naam</label>
                <input id="n" value={form.guestName} onChange={(e) => set('guestName', e.target.value)} placeholder="Jaise: Ravi Patil" />
              </div>
              <div className="field">
                <label htmlFor="e">Email</label>
                <input id="e" type="email" value={form.guestEmail} onChange={(e) => set('guestEmail', e.target.value)} placeholder="aap@example.com" />
              </div>
              <div className="field">
                <label htmlFor="p">Phone</label>
                <input id="p" inputMode="numeric" maxLength={10} value={form.guestPhone} onChange={(e) => set('guestPhone', e.target.value.replace(/\D/g, ''))} placeholder="98765 43210" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <label className="flex items-center gap-2 text-[14.5px]">
                <input type="checkbox" checked={wantGst} onChange={(e) => setWantGst(e.target.checked)} />
                GST invoice chahiye
              </label>
              {wantGst && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="field">
                    <label htmlFor="gst">GSTIN</label>
                    <input id="gst" value={form.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} placeholder="27ABCDE1234F1Z5" />
                  </div>
                  <div className="field">
                    <label htmlFor="co2">Company</label>
                    <input id="co2" value={form.gstCompany} onChange={(e) => set('gstCompany', e.target.value)} />
                  </div>
                </div>
              )}
              {!wantGst && (
                <p className="mt-3 text-[13.5px]" style={{ color: 'var(--basalt-soft)' }}>
                  Zaroorat nahi ho to seedha aage badhiye.
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <dl className="divide-y text-[14px]">
              {(
                [
                  ['Dates', `${form.checkIn} → ${form.checkOut} (${nights} ${nights === 1 ? 'night' : 'nights'})`],
                  ['Guests', `${form.guests} guests · ${form.rooms} rooms`],
                  ['Naam', form.guestName],
                  ['Email', form.guestEmail],
                  ['Phone', form.guestPhone],
                  ['GST', wantGst ? `${form.gstin} · ${form.gstCompany}` : 'Nahi chahiye'],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="grid grid-cols-[90px_1fr] gap-3 py-3">
                  <dt style={{ color: 'var(--basalt-soft)' }}>{k}</dt>
                  <dd className="break-words">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          {error && (
            <p
              className="mt-5 rounded-lg px-4 py-3 text-[13.5px]"
              style={{ background: 'color-mix(in srgb, var(--laterite) 12%, transparent)', color: 'var(--laterite)' }}
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="mt-6 flex items-center gap-3">
            {step > 0 && (
              <button className="btn btn-secondary" onClick={() => { setStep((s) => s - 1); setError(null); }}>
                Peeche
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                className="btn btn-primary"
                onClick={() => {
                  const p = validate();
                  setError(p);
                  if (!p) setStep((s) => s + 1);
                }}
              >
                Aage badhein
              </button>
            ) : (
              <button className="btn btn-primary" onClick={submit} disabled={busy}>
                {busy ? 'Book ho raha hai…' : `${INR(total)} — booking pakki karo`}
              </button>
            )}
          </div>
        </div>
      </div>

      <aside className="card sticky top-24 p-6">
        <h2 className="text-[16px] font-semibold">Kharcha</h2>
        <dl className="mt-4 space-y-2 text-[14px]">
          <div className="flex justify-between gap-3">
            <dt style={{ color: 'var(--basalt)' }}>
              {INR(price)} × {nights} × {form.rooms}
            </dt>
            <dd className="data">{INR(base)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt style={{ color: 'var(--basalt)' }}>Taxes ({taxPct}%)</dt>
            <dd className="data">{INR(taxes)}</dd>
          </div>
          <div className="flex justify-between border-t pt-3 text-[17px] font-semibold">
            <dt>Total</dt>
            <dd className="data">{INR(total)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-[12.5px]" style={{ color: 'var(--basalt-soft)' }}>
          Payment gateway abhi connect nahi hai, isliye booking bina paise kate confirm hoti hai.
        </p>
      </aside>
    </div>
  );
}
