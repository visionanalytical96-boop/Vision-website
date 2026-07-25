import Link from 'next/link';
import type { BusRoute } from '@/lib/types';
import { formatINR, durationLabel } from '@/lib/utils';

export function BusCard({ bus }: { bus: BusRoute }) {
  return (
    <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <div className="sm:w-48">
        <p className="text-sm font-semibold text-royal-900">{bus.operator}</p>
        <p className="text-xs text-royal-400">{bus.busType} · {bus.isAc ? 'AC' : 'Non-AC'} · {bus.seatType}</p>
        <div className="mt-1 text-xs text-saffron-600">★ {bus.rating}</div>
      </div>

      <div className="flex flex-1 items-center justify-between gap-3 sm:justify-center sm:gap-8">
        <div className="text-center">
          <p className="text-lg font-bold text-royal-900">{bus.departureTime}</p>
          <p className="text-xs text-royal-500">{bus.fromCity}</p>
        </div>
        <div className="flex flex-1 flex-col items-center text-royal-400">
          <p className="text-xs">{durationLabel(bus.durationMinutes)}</p>
          <div className="my-1 h-px w-full min-w-16 bg-royal-200" />
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-royal-900">{bus.arrivalTime}</p>
          <p className="text-xs text-royal-500">{bus.toCity}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-surface-border pt-3 sm:w-56 sm:flex-col sm:items-end sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
        <div className="flex flex-wrap gap-1 text-xs text-royal-500 sm:justify-end">
          {bus.amenities.slice(0, 3).map((a) => (
            <span key={a} className="rounded-full bg-royal-50 px-2 py-0.5">{a}</span>
          ))}
        </div>
        <p className="text-xs text-royal-400">{bus.seatsAvailable} seats left</p>
        <div className="text-right">
          <p className="text-xl font-bold text-royal-900">{formatINR(bus.price)}</p>
          <Link href={`/checkout?type=bus&amount=${bus.price}`} className="btn-primary mt-1 inline-flex text-xs">
            Select Seats
          </Link>
        </div>
      </div>
    </div>
  );
}
