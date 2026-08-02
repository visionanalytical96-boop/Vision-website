import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { expireStaleOffers, haversineKm, VEHICLE_LABEL } from '@/lib/rides';

export const dynamic = 'force-dynamic';

/**
 * The customer's tracking page polls this. Rider identity is only released
 * once the ride is accepted — before that the customer has no business
 * holding a rider's name and number.
 */
export async function GET(_request: Request, { params }: { params: { ref: string } }) {
  await expireStaleOffers();

  const ride = await db.ride.findUnique({
    where: { ref: params.ref },
    include: { rider: { select: { name: true, phone: true, vehicleNumber: true, vehicleType: true, lat: true, lng: true, lastSeenAt: true } } },
  });
  if (!ride) return NextResponse.json({ error: 'Ride nahi mili' }, { status: 404 });

  const shareRider = ride.rider && ['ACCEPTED', 'ARRIVED', 'ONGOING', 'COMPLETED'].includes(ride.status);

  return NextResponse.json({
    ok: true,
    ref: ride.ref,
    status: ride.status,
    vehicle: VEHICLE_LABEL[ride.vehicleType],
    pickup: { label: ride.pickupLabel, lat: ride.pickupLat, lng: ride.pickupLng },
    drop: { label: ride.dropLabel, lat: ride.dropLat, lng: ride.dropLng },
    distanceKm: ride.distanceKm,
    fare: ride.fare,
    // Shown to the customer so they can read it out; the rider needs it to start.
    startOtp: ride.status === 'COMPLETED' || ride.status === 'CANCELLED' ? null : ride.startOtp,
    cancelReason: ride.cancelReason,
    rider: shareRider
      ? {
          name: ride.rider!.name,
          phone: ride.rider!.phone,
          vehicleNumber: ride.rider!.vehicleNumber,
          vehicle: VEHICLE_LABEL[ride.rider!.vehicleType],
          lat: ride.rider!.lat,
          lng: ride.rider!.lng,
          awayKm:
            ride.rider!.lat !== null && ride.rider!.lng !== null
              ? Math.round(
                  haversineKm(
                    ride.status === 'ONGOING' ? ride.dropLat : ride.pickupLat,
                    ride.status === 'ONGOING' ? ride.dropLng : ride.pickupLng,
                    ride.rider!.lat,
                    ride.rider!.lng,
                  ) * 10,
                ) / 10
              : null,
        }
      : null,
  });
}
