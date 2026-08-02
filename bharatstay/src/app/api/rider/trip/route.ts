import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { offerToNextRider } from '@/lib/rides';

export const dynamic = 'force-dynamic';

const schema = z.object({
  rideId: z.string().min(1),
  action: z.enum(['accept', 'decline', 'arrived', 'start', 'complete', 'cancel']),
  otp: z.string().trim().max(6).optional(),
  reason: z.string().trim().max(200).optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.phone) return NextResponse.json({ error: 'Login zaroori hai' }, { status: 401 });

  const rider = await db.rider.findUnique({ where: { phone: session.phone } });
  if (!rider || rider.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Rider account approve nahi hai' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Galat request' }, { status: 400 });
  const { rideId, action, otp, reason } = parsed.data;

  const ride = await db.ride.findUnique({ where: { id: rideId } });
  if (!ride) return NextResponse.json({ error: 'Ride nahi mili' }, { status: 404 });

  if (action === 'accept') {
    if (ride.status !== 'REQUESTED' || ride.offeredToId !== rider.id) {
      return NextResponse.json({ error: 'Yeh ride ab available nahi hai' }, { status: 409 });
    }
    // Conditional update so two riders tapping accept at once cannot both win.
    const claimed = await db.ride.updateMany({
      where: { id: rideId, status: 'REQUESTED', offeredToId: rider.id },
      data: { status: 'ACCEPTED', riderId: rider.id, acceptedAt: new Date(), offeredToId: null, offerExpiresAt: null },
    });
    if (claimed.count === 0) return NextResponse.json({ error: 'Koi aur rider pehle le gaya' }, { status: 409 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'decline') {
    if (ride.status !== 'REQUESTED') return NextResponse.json({ ok: true });
    await db.ride.update({
      where: { id: rideId },
      data: { declinedBy: { push: rider.id }, offeredToId: null, offerExpiresAt: null },
    });
    await offerToNextRider(rideId);
    return NextResponse.json({ ok: true });
  }

  // Everything below is only for the rider actually on the trip.
  if (ride.riderId !== rider.id) return NextResponse.json({ error: 'Yeh aapki ride nahi hai' }, { status: 403 });

  if (action === 'arrived') {
    if (ride.status !== 'ACCEPTED') return NextResponse.json({ error: 'Abhi nahi' }, { status: 409 });
    await db.ride.update({ where: { id: rideId }, data: { status: 'ARRIVED', arrivedAt: new Date() } });
    return NextResponse.json({ ok: true });
  }

  if (action === 'start') {
    if (ride.status !== 'ARRIVED' && ride.status !== 'ACCEPTED') {
      return NextResponse.json({ error: 'Abhi nahi' }, { status: 409 });
    }
    // The customer reads the code out, so a trip cannot start against the
    // wrong passenger or before the rider has actually reached them.
    if ((otp ?? '').trim() !== ride.startOtp) {
      return NextResponse.json({ error: 'Galat OTP — customer se 4 digit ka code poochhiye' }, { status: 401 });
    }
    await db.ride.update({ where: { id: rideId }, data: { status: 'ONGOING', startedAt: new Date() } });
    return NextResponse.json({ ok: true });
  }

  if (action === 'complete') {
    if (ride.status !== 'ONGOING') return NextResponse.json({ error: 'Trip abhi shuru nahi hui' }, { status: 409 });
    await db.ride.update({ where: { id: rideId }, data: { status: 'COMPLETED', completedAt: new Date() } });
    await db.auditLog.create({
      data: { actorName: rider.name, action: 'ride.completed', entity: 'Ride', entityId: rideId, detail: `${ride.ref} · ₹${ride.fare}` },
    });
    return NextResponse.json({ ok: true });
  }

  if (ride.status === 'COMPLETED') return NextResponse.json({ error: 'Poori ho chuki ride cancel nahi hoti' }, { status: 409 });
  await db.ride.update({
    where: { id: rideId },
    data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason || 'Rider ne cancel ki' },
  });
  return NextResponse.json({ ok: true });
}
