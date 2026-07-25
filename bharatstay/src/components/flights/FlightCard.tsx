import Link from 'next/link';
import type { Flight } from '@/lib/types';
import { formatINR, durationLabel } from '@/lib/utils';

export function FlightCard({ flight }: { flight: Flight }) {
  return (
    <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3 sm:w-48">
        <span className="text-2xl">{flight.airlineLogo}</span>
        <div>
          <p className="text-sm font-semibold text-royal-900">{flight.airline}</p>
          <p className="text-xs text-royal-400">{flight.flightNumber}</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-between gap-3 sm:justify-center sm:gap-8">
        <div className="text-center">
          <p className="text-lg font-bold text-royal-900">{flight.departureTime}</p>
          <p className="text-xs text-royal-500">{flight.fromCity} ({flight.fromCode})</p>
        </div>
        <div className="flex flex-1 flex-col items-center text-royal-400">
          <p className="text-xs">{durationLabel(flight.durationMinutes)}</p>
          <div className="my-1 h-px w-full min-w-16 bg-royal-200" />
          <p className="text-xs">{flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop`}</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-royal-900">{flight.arrivalTime}</p>
          <p className="text-xs text-royal-500">{flight.toCity} ({flight.toCode})</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-surface-border pt-3 sm:w-56 sm:flex-col sm:items-end sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
        <div className="text-xs text-royal-500">
          <p>{flight.cabinClass} · {flight.refundable ? 'Refundable' : 'Non-refundable'}</p>
          <p>{flight.baggageKg}kg check-in + {flight.cabinBaggageKg}kg cabin</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-royal-900">{formatINR(flight.price)}</p>
          <Link href={`/checkout?type=flight&amount=${flight.price}`} className="btn-primary mt-1 inline-flex text-xs">
            Book Now
          </Link>
        </div>
      </div>
    </div>
  );
}
