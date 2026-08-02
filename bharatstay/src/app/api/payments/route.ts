import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createOrder, paymentsLive } from '@/lib/payments';

export const dynamic = 'force-dynamic';

const schema = z.object({ ref: z.string().min(3).max(40) });

/** Starts a payment for an existing booking. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Galat request' }, { status: 400 });

  const booking = await db.booking.findUnique({
    where: { ref: parsed.data.ref },
    select: { id: true, ref: true, totalAmount: true, status: true },
  });
  if (!booking) return NextResponse.json({ error: 'Booking nahi mili' }, { status: 404 });
  if (booking.status === 'CANCELLED') return NextResponse.json({ error: 'Yeh booking cancel ho chuki hai' }, { status: 409 });

  if (!paymentsLive()) {
    // No merchant account yet — confirm without charging, and say so.
    await db.booking.update({ where: { id: booking.id }, data: { status: 'CONFIRMED', paymentMode: 'mock' } });
    return NextResponse.json({ ok: true, mode: 'mock', ref: booking.ref });
  }

  const order = await createOrder(booking.totalAmount * 100, booking.ref);
  return NextResponse.json({
    ok: true,
    mode: 'razorpay',
    keyId: process.env.RAZORPAY_KEY_ID,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    ref: booking.ref,
  });
}
