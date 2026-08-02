import 'server-only';
import { randomInt } from 'node:crypto';
import type { VehicleType } from '@prisma/client';
import { db } from '@/lib/db';

/** A rider whose heartbeat is older than this is treated as offline. */
export const HEARTBEAT_TIMEOUT_MS = 45_000;
/** How long a rider has to accept an offer before it moves to the next rider. */
export const OFFER_TIMEOUT_MS = 25_000;

export const VEHICLE_LABEL: Record<VehicleType, string> = {
  BIKE: 'Bike',
  EBIKE: 'E-bike',
  AUTO: 'Auto',
  CAB: 'Cab',
  CAB_XL: 'Cab XL',
};

export const VEHICLE_EMOJI: Record<VehicleType, string> = {
  BIKE: '🏍️',
  EBIKE: '⚡',
  AUTO: '🛺',
  CAB: '🚗',
  CAB_XL: '🚙',
};

/** Passengers each vehicle carries — drives the "kitne log" picker. */
export const VEHICLE_SEATS: Record<VehicleType, number> = {
  BIKE: 1,
  EBIKE: 1,
  AUTO: 3,
  CAB: 4,
  CAB_XL: 6,
};

export const ALL_VEHICLE_TYPES = ['BIKE', 'EBIKE', 'AUTO', 'CAB', 'CAB_XL'] as const;

/**
 * Great-circle distance in km. This is straight-line, not road distance —
 * road routing needs a paid Directions API. Everything that surfaces a
 * distance or fare built on this must call it an estimate.
 */
export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Roads in this belt wind through ghats and level crossings, so the straight
 * line consistently understates the trip. This nudges it toward something
 * closer to reality without pretending to be a routing engine.
 */
export const ROAD_FACTOR = 1.3;

export type FareBreakdown = {
  distanceKm: number;
  roadKm: number;
  baseFare: number;
  distanceFare: number;
  fare: number;
};

export function quoteFare(
  straightKm: number,
  rule: { baseFare: number; perKm: number; minFare: number },
): FareBreakdown {
  const roadKm = Math.round(straightKm * ROAD_FACTOR * 10) / 10;
  const distanceFare = Math.round(roadKm * rule.perKm);
  const fare = Math.max(rule.minFare, rule.baseFare + distanceFare);
  return {
    distanceKm: Math.round(straightKm * 10) / 10,
    roadKm,
    baseFare: rule.baseFare,
    distanceFare,
    fare,
  };
}

export const rideRef = () => `RD-${String(randomInt(0, 1_000_000)).padStart(6, '0')}`;
export const tripOtp = () => String(randomInt(0, 10_000)).padStart(4, '0');

/** Riders who are genuinely online right now: flagged online AND still beating. */
export function onlineWhere() {
  return {
    status: 'APPROVED' as const,
    online: true,
    lastSeenAt: { gt: new Date(Date.now() - HEARTBEAT_TIMEOUT_MS) },
    lat: { not: null },
    lng: { not: null },
  };
}

/**
 * Picks the closest live rider of the right vehicle type who has not already
 * turned this ride down. Distance is computed in JS rather than SQL because the
 * candidate set here is small (one belt, a handful of riders) and this keeps
 * the maths identical to what the UI shows.
 */
export async function findNearestRider(
  rideId: string,
): Promise<{ riderId: string; distanceKm: number } | null> {
  const ride = await db.ride.findUnique({ where: { id: rideId } });
  if (!ride) return null;

  const rule = await db.fareRule.findUnique({ where: { vehicleType: ride.vehicleType } });
  const radius = rule?.matchRadiusKm ?? 6;

  const candidates = await db.rider.findMany({
    where: {
      ...onlineWhere(),
      vehicleType: ride.vehicleType,
      id: { notIn: ride.declinedBy },
    },
    select: { id: true, lat: true, lng: true },
  });

  // A rider already on a live trip should not be offered another one.
  const busy = await db.ride.findMany({
    where: {
      riderId: { in: candidates.map((c) => c.id) },
      status: { in: ['ACCEPTED', 'ARRIVED', 'ONGOING'] },
    },
    select: { riderId: true },
  });
  const busyIds = new Set(busy.map((b) => b.riderId));

  let best: { riderId: string; distanceKm: number } | null = null;
  for (const c of candidates) {
    if (busyIds.has(c.id) || c.lat === null || c.lng === null) continue;
    const d = haversineKm(ride.pickupLat, ride.pickupLng, c.lat, c.lng);
    if (d > radius) continue;
    if (!best || d < best.distanceKm) best = { riderId: c.id, distanceKm: d };
  }
  return best;
}

/**
 * Moves a REQUESTED ride to the next candidate. Called when the ride is
 * created and whenever an offer is declined or lapses, so a ride keeps
 * hunting instead of silently dying.
 */
export async function offerToNextRider(rideId: string): Promise<'offered' | 'no_rider'> {
  const next = await findNearestRider(rideId);
  if (!next) {
    await db.ride.updateMany({
      where: { id: rideId, status: 'REQUESTED' },
      data: { status: 'NO_RIDER', offeredToId: null, offerExpiresAt: null },
    });
    return 'no_rider';
  }
  await db.ride.updateMany({
    where: { id: rideId, status: 'REQUESTED' },
    data: { offeredToId: next.riderId, offerExpiresAt: new Date(Date.now() + OFFER_TIMEOUT_MS) },
  });
  return 'offered';
}

/**
 * Rolls forward any offers that have run out. There is no background worker
 * here, so this is called from the endpoints that riders and customers poll —
 * which is exactly when it matters.
 */
export async function expireStaleOffers(): Promise<void> {
  const stale = await db.ride.findMany({
    where: { status: 'REQUESTED', offeredToId: { not: null }, offerExpiresAt: { lt: new Date() } },
    select: { id: true, offeredToId: true },
  });
  for (const ride of stale) {
    if (!ride.offeredToId) continue;
    await db.ride.update({
      where: { id: ride.id },
      data: { declinedBy: { push: ride.offeredToId }, offeredToId: null, offerExpiresAt: null },
    });
    await offerToNextRider(ride.id);
  }
}
