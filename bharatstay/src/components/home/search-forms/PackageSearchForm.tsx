'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function PackageSearchForm() {
  const router = useRouter();
  const [destination, setDestination] = useState('Kerala');
  const [travelMonth, setTravelMonth] = useState('2026-09');
  const [travellers, setTravellers] = useState(2);
  const [budget, setBudget] = useState('Any');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ destination, travelMonth, travellers: String(travellers), budget });
    router.push(`/packages?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label className="field-label" htmlFor="pkg-destination">Destination</label>
        <input id="pkg-destination" className="input-field" value={destination} onChange={(e) => setDestination(e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor="pkg-month">Travel month</label>
        <input id="pkg-month" type="month" className="input-field" value={travelMonth} onChange={(e) => setTravelMonth(e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor="pkg-travellers">Travellers</label>
        <input id="pkg-travellers" type="number" min={1} max={20} className="input-field" value={travellers} onChange={(e) => setTravellers(Number(e.target.value))} />
      </div>
      <div>
        <label className="field-label" htmlFor="pkg-budget">Budget</label>
        <select id="pkg-budget" className="input-field" value={budget} onChange={(e) => setBudget(e.target.value)}>
          <option>Any</option>
          <option>Under ₹10,000</option>
          <option>₹10,000 – ₹20,000</option>
          <option>Above ₹20,000</option>
        </select>
      </div>
      <div className="flex items-end lg:col-span-4">
        <button type="submit" className="btn-primary w-full lg:w-auto lg:px-10">
          Search Packages
        </button>
      </div>
    </form>
  );
}
