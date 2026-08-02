import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { getEnabledServices } from '@/lib/site';
import { haversineKm, offerToNextRider, quoteFare, rideRef, tripOtp } from '@/lib/rides';

export const dynamic = 'force-dynamic';

const point = { lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) };

const quoteSchema = z.object({
  action: z.literal('quote'),
  vehicleType: z.enum(['BIKE', 'EBIKE', 'AUTO', 'CAB', 'CAB_XL']),
  pickup: z.object(point),
  drop: z.object(point),
});

const bookSchema = z.object({
  action: z.literal('book'),
  vehicleType: z.enum(['BIKE', 'EBIKE', 'AUTO', 'CAB', 'CAB_XL']),
  pickup: z.object({ ...point, label: z.string().trim().min(2).max(120) }),
  drop: z.object({ ...point, label: z.string().trim().min(2).max(120) }),
  customerName: z.string().trim().min(2).max(80),
  customerPhone: z.string().trim().min(10).max(15),
});

export async function POST(request: Request) {
  const enabled = await getEnabledServices();
  if (!enabled.has('rides')) return NextResponse.json({ error: 'Ride service abhi band hai' }, { status: 404 });

  const parsed = z.union([quoteSchema, bookSchema]).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Galat request' }, { status: 400 });
  const d = parsed.data;

  const rule = await db.fareRule.findUnique({ where: { vehicleType: d.vehicleType } });
  if (!rule || !rule.enabled) return NextResponse.json({ error: 'Yeh vehicle abhi available nahi hai' }, { status: 400 });

  const straightKm = haversineKm(d.pickup.lat, d.pickup.lng, d.drop.lat, d.drop.lng);
  if (straightKm < 0.1) return NextResponse.json({ error: 'Pickup aur drop alag hone chahiye' }, { status: 400 });
  if (straightKm > 60) return NextResponse.json({ error: 'Itni door ki ride abhi nahi hoti' }, { status: 400 });

  const quote = quoteFare(straightKm, rule);

  if (d.action === 'quote') return NextResponse.json({ ok: true, ...quote });

  const session = await getSession();
  const ride = await db.ride.create({
    data: {
      ref: rideRef(),
      vehicleType: d.vehicleType,
      customerId: session?.userId ?? null,
      customerName: d.customerName,
      customerPhone: d.customerPhone.replace(/\D/g, '').slice(-10),
      pickupLabel: d.pickup.label,
      pickupLat: d.pickup.lat,
      pickupLng: d.pickup.lng,
      dropLabel: d.drop.label,
      dropLat: d.drop.lat,
      dropLng: d.drop.lng,
      distanceKm: quote.distanceKm,
      baseFare: quote.baseFare,
      distanceFare: quote.distanceFare,
      fare: quote.fare,
      startOtp: tripOtp(),
    },
    select: { id: true, ref: true },
  });

  const result = await offerToNextRider(ride.id);
  return NextResponse.json({ ok: true, ...ride, matched: result === 'offered' });
}
