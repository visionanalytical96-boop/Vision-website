import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/payments';

export const dynamic = 'force-dynamic';

/**
 * Razorpay's server-to-server confirmation. This is the source of truth for
 * whether money moved — the browser can close mid-payment, but the webhook
 * still arrives.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get('x-razorpay-signature') ?? '';
  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: 'bad signature' }, { status: 400 });
  }

  let event: { event?: string; payload?: { payment?: { entity?: { notes?: Record<string, string>; order_id?: string; id?: string } } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'bad body' }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  const ref = payment?.notes?.receipt ?? payment?.notes?.ref;
  if (!ref) return NextResponse.json({ ok: true, ignored: 'no booking reference' });

  const booking = await db.booking.findUnique({ where: { ref }, select: { id: true } });
  if (!booking) return NextResponse.json({ ok: true, ignored: 'unknown booking' });

  if (event.event === 'payment.captured') {
    await db.booking.update({ where: { id: booking.id }, data: { status: 'CONFIRMED', paymentMode: 'razorpay' } });
  } else if (event.event === 'payment.failed') {
    await db.booking.update({ where: { id: booking.id }, data: { status: 'PENDING' } });
  }

  await db.auditLog.create({
    data: { actorName: 'Razorpay webhook', action: event.event ?? 'payment.event', entity: 'Booking', entityId: booking.id, detail: ref },
  });

  return NextResponse.json({ ok: true });
}
