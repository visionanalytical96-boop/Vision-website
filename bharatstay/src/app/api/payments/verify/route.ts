import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyCheckoutSignature } from '@/lib/payments';

export const dynamic = 'force-dynamic';

const schema = z.object({
  ref: z.string().min(3).max(40),
  orderId: z.string().min(3),
  paymentId: z.string().min(3),
  signature: z.string().min(10),
});

/**
 * The browser reports a successful payment here. The signature is what makes
 * that claim trustworthy — an unsigned or mis-signed report never marks a
 * booking paid.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Galat request' }, { status: 400 });
  const { ref, orderId, paymentId, signature } = parsed.data;

  if (!verifyCheckoutSignature(orderId, paymentId, signature)) {
    return NextResponse.json({ error: 'Payment verify nahi hua' }, { status: 400 });
  }

  const booking = await db.booking.findUnique({ where: { ref }, select: { id: true } });
  if (!booking) return NextResponse.json({ error: 'Booking nahi mili' }, { status: 404 });

  await db.booking.update({
    where: { id: booking.id },
    data: { status: 'CONFIRMED', paymentMode: 'razorpay' },
  });
  await db.auditLog.create({
    data: { actorName: 'Razorpay', action: 'payment.captured', entity: 'Booking', entityId: booking.id, detail: `${ref} · ${paymentId}` },
  });

  return NextResponse.json({ ok: true });
}
