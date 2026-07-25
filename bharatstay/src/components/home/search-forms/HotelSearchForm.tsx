'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const PROPERTY_TYPES = ['Any', 'Hotel', 'Resort', 'Villa', 'Homestay', 'Farm Stay'];

export function HotelSearchForm() {
  const router = useRouter();
  const [destination, setDestination] = useState('Goa');
  const [checkIn, setCheckIn] = useState('2026-08-14');
  const [checkOut, setCheckOut] = useState('2026-08-17');
  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [propertyType, setPropertyType] = useState('Any');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({
      destination,
      checkIn,
      checkOut,
      rooms: String(rooms),
      adults: String(adults),
      children: String(children),
      propertyType,
    });
    router.push(`/hotels?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="lg:col-span-2">
        <label className="field-label" htmlFor="destination">Destination, city or property</label>
        <input
          id="destination"
          className="input-field"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Where are you going?"
        />
      </div>
      <div>
        <label className="field-label" htmlFor="checkin">Check-in</label>
        <input id="checkin" type="date" className="input-field" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor="checkout">Check-out</label>
        <input id="checkout" type="date" className="input-field" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor="rooms">Rooms</label>
        <input id="rooms" type="number" min={1} max={10} className="input-field" value={rooms} onChange={(e) => setRooms(Number(e.target.value))} />
      </div>
      <div>
        <label className="field-label" htmlFor="adults">Adults</label>
        <input id="adults" type="number" min={1} max={20} className="input-field" value={adults} onChange={(e) => setAdults(Number(e.target.value))} />
      </div>
      <div>
        <label className="field-label" htmlFor="children">Children</label>
        <input id="children" type="number" min={0} max={10} className="input-field" value={children} onChange={(e) => setChildren(Number(e.target.value))} />
      </div>
      <div>
        <label className="field-label" htmlFor="propertyType">Property type</label>
        <select id="propertyType" className="input-field" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
          {PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="flex items-end lg:col-span-4">
        <button type="submit" className="btn-primary w-full lg:w-auto lg:px-10">
          Search Hotels
        </button>
      </div>
    </form>
  );
}
