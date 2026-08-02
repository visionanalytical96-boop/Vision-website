'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { INR } from '@/lib/format';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

/**
 * One button for every payment method — Razorpay's checkout sheet carries the
 * UPI QR scanner, Google Pay, PhonePe, cards, netbanking and wallets, so there
 * is nothing per-method to build or maintain here.
 */
export function PayButton({ refCode, amount, name }: { refCode: string; amount: number; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadCheckout(): Promise<void> {
    if (window.Razorpay) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('checkout failed to load'));
      document.head.appendChild(s);
    });
  }

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: refCode }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error ?? 'Payment shuru nahi ho paya');

      if (order.mode === 'mock') {
        router.refresh();
        setBusy(false);
        return;
      }

      await loadCheckout();
      if (!window.Razorpay) throw new Error('Checkout load nahi hua');

      new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'BharatStay',
        description: `Booking ${refCode}`,
        prefill: { name },
        notes: { receipt: refCode },
        theme: { color: '#b4472b' },
        handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const verify = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ref: refCode,
              orderId: r.razorpay_order_id,
              paymentId: r.razorpay_payment_id,
              signature: r.razorpay_signature,
            }),
          });
          if (!verify.ok) {
            setError('Paisa kat gaya lekin verify nahi hua — support se baat kijiye, reference: ' + refCode);
            return;
          }
          router.refresh();
        },
        modal: { ondismiss: () => setBusy(false) },
      }).open();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment nahi ho paya');
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="btn btn-primary w-full" onClick={pay} disabled={busy}>
        {busy ? 'Kholte hain…' : `${INR(amount)} pay karo`}
      </button>
      <p className="mt-2 text-center text-[12px]" style={{ color: 'var(--basalt-soft)' }}>
        UPI scanner · Google Pay · PhonePe · card · netbanking
      </p>
      {error && (
        <p className="mt-3 text-[13px]" style={{ color: 'var(--laterite)' }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
