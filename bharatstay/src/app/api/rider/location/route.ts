import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { expireStaleOffers, HEARTBEAT_TIMEOUT_MS, VEHICLE_LABEL } from '@/lib/rides';

export const dynamic = 'force-dynamic';

const schema = z.object({
  online: z.boolean(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  accuracyM: z.number().min(0).max(100_000).optional(),
});

/**
 * The rider's phone posts here every few seconds while they are online. It
 * doubles as the rider's poll: the response carries whatever ride is currently
 * being offered to them, and their active trip.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.phone) return NextResponse.json({ error: 'Login zaroori hai' }, { status: 401 });

  const rider = await db.rider.findUnique({ where: { phone: session.phone } });
  if (!rider) return NextResponse.json({ error: 'Rider account nahi mila' }, { status: 404 });
  if (rider.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Aapka account abhi approve nahi hua', status: rider.status }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Galat request' }, { status: 400 });
  const { online, lat, lng, accuracyM } = parsed.data;

  await db.rider.update({
    where: { id: rider.id },
    data: {
      online,
      lastSeenAt: new Date(),
      ...(lat !== undefined && lng !== undefined ? { lat, lng, accuracyM: accuracyM ?? null } : {}),
    },
  });

  // Riders poll far more often than customers, so this is the natural place to
  // move on offers nobody answered.
  await expireStaleOffers();

  const [offer, active] = await Promise.all([
    online
      ? db.ride.findFirst({
          where: { status: 'REQUESTED', offeredToId: rider.id, offerExpiresAt: { gt: new Date() } },
          select: {
            id: true, ref: true, vehicleType: true, pickupLabel: true, dropLabel: true,
            pickupLat: true, pickupLng: true, distanceKm: true, fare: true, offerExpiresAt: true,
          },
        })
      : Promise.resolve(null),
    db.ride.findFirst({
      where: { riderId: rider.id, status: { in: ['ACCEPTED', 'ARRIVED', 'ONGOING'] } },
      select: {
        id: true, ref: true, status: true, pickupLabel: true, dropLabel: true,
        pickupLat: true, pickupLng: true, dropLat: true, dropLng: true,
        distanceKm: true, fare: true, customerName: true, customerPhone: true,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    rider: { id: rider.id, name: rider.name, vehicle: VEHICLE_LABEL[rider.vehicleType], online },
    heartbeatMs: HEARTBEAT_TIMEOUT_MS,
    offer,
    active,
  });
}
