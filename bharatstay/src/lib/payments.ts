import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Razorpay covers UPI (the QR scanner, Google Pay, PhonePe, Paytm), cards,
 * netbanking and wallets through one checkout, so there is a single
 * integration here rather than one per method.
 *
 * With no keys configured the whole thing falls back to mock mode: bookings
 * still complete, they are just never charged. That keeps the site usable
 * before a merchant account exists, and the mode is always shown on screen
 * rather than hidden.
 */

export const paymentsLive = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.PAYMENT_PROVIDER === 'razorpay');

export type RazorpayOrder = { id: string; amount: number; currency: string };

export async function createOrder(amountPaise: number, receipt: string): Promise<RazorpayOrder> {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, payment_capture: 1 }),
  });
  if (!res.ok) throw new Error(`razorpay order failed: ${res.status} ${await res.text().catch(() => '')}`);
  return (await res.json()) as RazorpayOrder;
}

/** Constant-time compare so a signature check cannot be probed byte by byte. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Verifies the signature Razorpay returns to the browser. Without this a
 * client could claim any payment succeeded, so a booking must never be marked
 * paid on the browser's word alone.
 */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqual(expected, signature);
}

/** Verifies a webhook body against the separate webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}
