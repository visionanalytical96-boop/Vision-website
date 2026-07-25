'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const BUS_TYPES = ['Any', 'AC Sleeper', 'AC Seater', 'Non-AC Sleeper', 'Non-AC Seater'];

export function BusSearchForm() {
  const router = useRouter();
  const [from, setFrom] = useState('Mumbai');
  const [to, setTo] = useState('Pune');
  const [travelDate, setTravelDate] = useState('2026-08-01');
  const [busType, setBusType] = useState('Any');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ from, to, travelDate, busType });
    router.push(`/buses?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label className="field-label" htmlFor="bus-from">From</label>
        <input id="bus-from" className="input-field" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor="bus-to">To</label>
        <input id="bus-to" className="input-field" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor="bus-date">Travel date</label>
        <input id="bus-date" type="date" className="input-field" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor="bus-type">Bus type</label>
        <select id="bus-type" className="input-field" value={busType} onChange={(e) => setBusType(e.target.value)}>
          {BUS_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="flex items-end lg:col-span-4">
        <button type="submit" className="btn-primary w-full lg:w-auto lg:px-10">
          Search Buses
        </button>
      </div>
    </form>
  );
}
