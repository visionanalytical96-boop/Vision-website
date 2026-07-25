'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const TRIP_TYPES = ['One Way', 'Round Trip', 'Multi City'];
const CABIN_CLASSES = ['Economy', 'Premium Economy', 'Business', 'First Class'];

export function FlightSearchForm() {
  const router = useRouter();
  const [tripType, setTripType] = useState('One Way');
  const [from, setFrom] = useState('Mumbai (BOM)');
  const [to, setTo] = useState('Delhi (DEL)');
  const [departure, setDeparture] = useState('2026-08-02');
  const [returnDate, setReturnDate] = useState('2026-08-09');
  const [travellers, setTravellers] = useState(1);
  const [cabinClass, setCabinClass] = useState('Economy');
  const [directOnly, setDirectOnly] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({
      tripType,
      from,
      to,
      departure,
      travellers: String(travellers),
      cabinClass,
      directOnly: String(directOnly),
    });
    if (tripType === 'Round Trip') params.set('returnDate', returnDate);
    router.push(`/flights?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {TRIP_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTripType(t)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              tripType === t ? 'border-royal-700 bg-royal-700 text-white' : 'border-surface-border text-royal-600 hover:bg-royal-50'
            }`}
          >
            {t}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm text-royal-600">
          <input type="checkbox" checked={directOnly} onChange={(e) => setDirectOnly(e.target.checked)} className="h-4 w-4 rounded border-surface-border text-royal-700" />
          Direct flights only
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="field-label" htmlFor="from">From</label>
          <input id="from" className="input-field" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="to">To</label>
          <input id="to" className="input-field" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="departure">Departure date</label>
          <input id="departure" type="date" className="input-field" value={departure} onChange={(e) => setDeparture(e.target.value)} />
        </div>
        {tripType === 'Round Trip' ? (
          <div>
            <label className="field-label" htmlFor="return">Return date</label>
            <input id="return" type="date" className="input-field" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
          </div>
        ) : (
          <div>
            <label className="field-label" htmlFor="travellers">Travellers</label>
            <input id="travellers" type="number" min={1} max={9} className="input-field" value={travellers} onChange={(e) => setTravellers(Number(e.target.value))} />
          </div>
        )}
        <div>
          <label className="field-label" htmlFor="cabinClass">Class</label>
          <select id="cabinClass" className="input-field" value={cabinClass} onChange={(e) => setCabinClass(e.target.value)}>
            {CABIN_CLASSES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        {tripType === 'Round Trip' ? (
          <div>
            <label className="field-label" htmlFor="travellers2">Travellers</label>
            <input id="travellers2" type="number" min={1} max={9} className="input-field" value={travellers} onChange={(e) => setTravellers(Number(e.target.value))} />
          </div>
        ) : null}
        <div className="flex items-end sm:col-span-2 lg:col-span-1">
          <button type="submit" className="btn-primary w-full">
            Search Flights
          </button>
        </div>
      </div>
    </form>
  );
}
