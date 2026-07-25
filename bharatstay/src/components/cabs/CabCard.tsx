import Link from 'next/link';
import type { CabOption } from '@/lib/types';
import { formatINR } from '@/lib/utils';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';

const DEMO_KM = 25;

export function CabCard({ cab }: { cab: CabOption }) {
  const estimatedFare = cab.perKmRate * DEMO_KM + cab.driverAllowance;

  return (
    <div className="card flex flex-col overflow-hidden sm:flex-row sm:items-center">
      <PlaceholderImage token={cab.image} className="h-32 w-full sm:h-28 sm:w-40" emojiClassName="text-4xl" />
      <div className="flex flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-royal-900">{cab.vehicleType}</p>
          <p className="text-xs text-royal-500">
            {cab.seatingCapacity} seats · {cab.luggageCapacity} bags · {cab.category}
          </p>
          <p className="mt-1 text-xs text-royal-400">
            {formatINR(cab.perKmRate)}/km + {formatINR(cab.driverAllowance)} driver allowance
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-royal-400">Estimated for {DEMO_KM} km</p>
          <p className="text-xl font-bold text-royal-900">{formatINR(estimatedFare)}</p>
          <Link href={`/checkout?type=cab&amount=${estimatedFare}`} className="btn-primary mt-1 inline-flex text-xs">
            Book Now
          </Link>
        </div>
      </div>
    </div>
  );
}
