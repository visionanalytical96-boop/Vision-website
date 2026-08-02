import { NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { paymentsLive } from '@/lib/payments';

export const dynamic = 'force-dynamic';

const schema = z.object({
  staySlug: z.string().min(1),
  checkIn: z.string().min(8),
  checkOut: z.string().min(8),
  guests: z.coerce.number().int().min(1).max(40),
  rooms: z.coerce.number().int().min(1).max(20),
  guestName: z.string().trim().min(2).max(80),
  guestEmail: z.string().trim().email(),
  guestPhone: z.string().trim().min(10).max(15),
  gstin: z.string().trim().max(20).optional(),
  gstCompany: z.string().trim().max(120).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first ? `${first.path.join('.')}: ${first.message}` : 'Galat data' }, { status: 400 });
  }
  const d = parsed.data;

  const stay = await db.stay.findUnique({ where: { slug: d.staySlug } });
  if (!stay || !stay.visible) return NextResponse.json({ error: 'Yeh stay ab available nahi hai' }, { status: 404 });

  const checkIn = new Date(d.checkIn);
  const checkOut = new Date(d.checkOut);
  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) || checkOut <= checkIn) {
    return NextResponse.json({ error: 'Check-out check-in ke baad hona chahiye' }, { status: 400 });
  }
  const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000));

  // Recomputed server-side: the browser's totals are a display, never the price.
  const baseAmount = stay.price * nights * d.rooms;
  const taxAmount = Math.round((baseAmount * stay.taxPct) / 100);

  const session = await getSession();
  const ref = `BST-${new Date().getFullYear()}-${String(randomInt(0, 1_000_000)).padStart(6, '0')}`;

  const booking = await db.booking.create({
    data: {
      ref,
      kind: 'STAY',
      status: paymentsLive() ? 'PENDING' : 'CONFIRMED',
      userId: session?.userId ?? null,
      guestName: d.guestName,
      guestEmail: d.guestEmail,
      guestPhone: d.guestPhone,
      stayId: stay.id,
      checkIn,
      checkOut,
      nights,
      guests: d.guests,
      rooms: d.rooms,
      baseAmount,
      taxAmount,
      totalAmount: baseAmount + taxAmount,
      gstin: d.gstin || null,
      gstCompany: d.gstCompany || null,
      paymentMode: paymentsLive() ? 'razorpay' : 'mock',
    },
    select: { ref: true },
  });

  return NextResponse.json({ ok: true, ref: booking.ref });
}
