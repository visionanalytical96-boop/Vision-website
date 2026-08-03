'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { INR } from '@/lib/format';

/**
 * Pay by UPI without a gateway: scan the QR on a computer, or tap the button
 * on a phone to open GPay/PhonePe/Paytm with the amount already filled in.
 * The customer then reports the UTR, which an admin checks against the bank.
 */
export function UpiPay({
  refCode,
  amount,
  payLink,
  qrDataUrl,
  upiId,
  payeeName,
  rejectedNote,
}: {
  refCode: string;
  amount: number;
  payLink: string;
  qrDataUrl: string;
  upiId: string;
  payeeName: string;
  rejectedNote?: string | null;
}) {
  const router = useRouter();
  const [utr, setUtr] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="card p-6">
      <p className="eyebrow">Payment</p>
      <h2 className="display mt-2 text-[26px]">{INR(amount)} bhejiye</h2>

      {rejectedNote && (
        <p
          className="mt-4 rounded-lg px-4 py-3 text-[13.5px]"
          style={{ background: 'color-mix(in srgb, var(--laterite) 14%, transparent)' }}
          role="alert"
        >
          <strong>Pichhli baar verify nahi hua:</strong> {rejectedNote}
        </p>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
        <div className="mx-auto sm:mx-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt={`${payeeName} ko ${INR(amount)} bhejne ka UPI QR code`}
            width={200}
            height={200}
            className="rounded-xl"
            style={{ background: '#fff', padding: '10px' }}
          />
          <p className="mt-2 text-center text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
            Kisi bhi UPI app se scan
          </p>
        </div>

        <div>
          <a href={payLink} className="btn btn-primary w-full sm:w-auto">
            Phone par UPI app kholo
          </a>
          <p className="mt-2 text-[12.5px]" style={{ color: 'var(--basalt-soft)' }}>
            GPay · PhonePe · Paytm · koi bhi bank app — amount pehle se bhara hoga
          </p>

          <dl className="mt-5 space-y-2 border-t pt-4 text-[14px]">
            <div className="flex items-baseline justify-between gap-3">
              <dt style={{ color: 'var(--basalt)' }}>UPI ID</dt>
              <dd className="flex items-center gap-2">
                <span className="data">{upiId}</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    void navigator.clipboard?.writeText(upiId);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? 'Copy ✓' : 'Copy'}
                </button>
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt style={{ color: 'var(--basalt)' }}>Kiske naam</dt>
              <dd>{payeeName}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt style={{ color: 'var(--basalt)' }}>Note mein likhiye</dt>
              <dd className="data">{refCode}</dd>
            </div>
          </dl>
        </div>
      </div>

      <form
        className="mt-7 border-t pt-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const res = await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ref: refCode, utr }),
          });
          setBusy(false);
          if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            return setError(json.error ?? 'Nahi ho paya');
          }
          router.refresh();
        }}
      >
        <label htmlFor="utr" className="text-[14.5px] font-semibold">
          Paisa bhej diya? UTR number daaliye
        </label>
        <p className="mt-1 text-[12.5px]" style={{ color: 'var(--basalt-soft)' }}>
          UPI app mein transaction kholiye — 12 digit ka UTR / reference number wahan milega.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <input
            id="utr"
            value={utr}
            onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))}
            inputMode="numeric"
            maxLength={12}
            placeholder="123456789012"
            required
            className="flex-1 rounded-lg border px-4 py-2.5 text-[15px] outline-none"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--surface-ink)', minWidth: '200px', letterSpacing: '0.1em' }}
          />
          <button className="btn btn-primary" disabled={busy || utr.length !== 12}>
            {busy ? 'Bhej rahe hain…' : 'Bhej dijiye'}
          </button>
        </div>

        {error && (
          <p className="mt-3 text-[13px]" style={{ color: 'var(--laterite)' }} role="alert">
            {error}
          </p>
        )}
      </form>

      <p className="mt-5 text-[12px] leading-relaxed" style={{ color: 'var(--basalt-soft)' }}>
        Paisa seedha malik ke UPI par jaata hai — beech mein koi gateway nahi. Isliye UTR daalne ke baad hum
        bank statement se milaan karke booking confirm karte hain, jisme thoda samay lag sakta hai.
      </p>
    </div>
  );
}
