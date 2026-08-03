import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isValidUtr } from '@/lib/upi';

export const dynamic = 'force-dynamic';

const schema = z.object({
  ref: z.string().trim().min(3).max(40),
  utr: z.string().trim().min(10).max(30),
});

/** The customer reports the UTR from their UPI app after paying. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Galat request' }, { status: 400 });

  const utr = parsed.data.utr.replace(/\D/g, '');
  if (!isValidUtr(utr)) {
    return NextResponse.json({ error: 'UTR 12 digit ka hota hai — apne UPI app mein dekhiye' }, { status: 400 });
  }

  const booking = await db.booking.findUnique({
    where: { ref: parsed.data.ref },
    select: { id: true, status: true },
  });
  if (!booking) return NextResponse.json({ error: 'Booking nahi mili' }, { status: 404 });
  if (booking.status === 'CANCELLED') {
    return NextResponse.json({ error: 'Yeh booking cancel ho chuki hai' }, { status: 409 });
  }
  if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') {
    return NextResponse.json({ error: 'Yeh booking pehle hi confirm hai' }, { status: 409 });
  }
  // One UTR at a time. If it turns out to be wrong the admin rejects it, which
  // puts the booking back to PENDING and lets the customer send the right one.
  if (booking.status === 'AWAITING_VERIFICATION') {
    return NextResponse.json(
      { error: 'UTR pehle hi bhej diya hai — hum verify kar rahe hain' },
      { status: 409 },
    );
  }

  // The same UTR cannot be claimed against two bookings — that is the one
  // thing a customer could try that this check can actually catch.
  const clash = await db.booking.findFirst({
    where: { upiRef: utr, id: { not: booking.id } },
    select: { ref: true },
  });
  if (clash) {
    return NextResponse.json({ error: 'Yeh UTR pehle se kisi aur booking par laga hai' }, { status: 409 });
  }

  await db.booking.update({
    where: { id: booking.id },
    data: {
      upiRef: utr,
      upiSubmittedAt: new Date(),
      upiRejectedNote: null,
      status: 'AWAITING_VERIFICATION',
      paymentMode: 'upi',
    },
  });

  await db.auditLog.create({
    data: { actorName: 'Customer', action: 'payment.utr_submitted', entity: 'Booking', entityId: booking.id, detail: `${parsed.data.ref} · UTR ${utr}` },
  });

  return NextResponse.json({ ok: true });
}
