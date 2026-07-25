'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const TRIP_CATEGORIES = ['Local', 'Airport Transfer', 'Outstation One-Way', 'Outstation Round Trip'];

export function CabSearchForm() {
  const router = useRouter();
  const [tripCategory, setTripCategory] = useState('Local');
  const [pickup, setPickup] = useState('Andheri, Mumbai');
  const [drop, setDrop] = useState('Mumbai Airport (BOM)');
  const [dateTime, setDateTime] = useState('2026-08-01T09:00');
  const [vehicleType, setVehicleType] = useState('Sedan');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ tripCategory, pickup, drop, dateTime, vehicleType });
    router.push(`/cabs?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {TRIP_CATEGORIES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTripCategory(t)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              tripCategory === t ? 'border-royal-700 bg-royal-700 text-white' : 'border-surface-border text-royal-600 hover:bg-royal-50'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="field-label" htmlFor="pickup">Pickup location</label>
          <input id="pickup" className="input-field" value={pickup} onChange={(e) => setPickup(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="drop">Drop location</label>
          <input id="drop" className="input-field" value={drop} onChange={(e) => setDrop(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="dateTime">Date &amp; time</label>
          <input id="dateTime" type="datetime-local" className="input-field" value={dateTime} onChange={(e) => setDateTime(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="vehicleType">Vehicle type</label>
          <select id="vehicleType" className="input-field" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
            <option>Hatchback</option>
            <option>Sedan</option>
            <option>SUV</option>
            <option>Luxury</option>
            <option>Tempo Traveller</option>
          </select>
        </div>
        <div className="flex items-end lg:col-span-4">
          <button type="submit" className="btn-primary w-full lg:w-auto lg:px-10">
            Search Cabs
          </button>
        </div>
      </div>
    </form>
  );
}
