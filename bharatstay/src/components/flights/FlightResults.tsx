'use client';

import { useMemo, useState } from 'react';
import { flights as allFlights } from '@/lib/mock-data';
import { FlightCard } from './FlightCard';

const SORT_OPTIONS = ['Price: Low to High', 'Price: High to Low', 'Duration', 'Departure Time'] as const;

export function FlightResults({ from, to }: { from?: string; to?: string }) {
  const [fromQuery, setFromQuery] = useState(from ?? '');
  const [toQuery, setToQuery] = useState(to ?? '');
  const [directOnly, setDirectOnly] = useState(false);
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]>('Price: Low to High');

  const results = useMemo(() => {
    let list = allFlights.filter((f) => {
      if (fromQuery && !`${f.fromCity} ${f.fromCode}`.toLowerCase().includes(fromQuery.toLowerCase())) return false;
      if (toQuery && !`${f.toCity} ${f.toCode}`.toLowerCase().includes(toQuery.toLowerCase())) return false;
      if (directOnly && f.stops > 0) return false;
      return true;
    });
    list = [...list];
    switch (sort) {
      case 'Price: Low to High':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'Price: High to Low':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'Duration':
        list.sort((a, b) => a.durationMinutes - b.durationMinutes);
        break;
      case 'Departure Time':
        list.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
        break;
      default:
        break;
    }
    return list;
  }, [fromQuery, toQuery, directOnly, sort]);

  return (
    <div className="container-xl py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-royal-900">Flight Search Results</h1>
        <p className="text-sm text-royal-500">{results.length} flights found</p>
      </div>

      <div className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="field-label" htmlFor="from">From</label>
          <input id="from" className="input-field" value={fromQuery} onChange={(e) => setFromQuery(e.target.value)} placeholder="Any city" />
        </div>
        <div>
          <label className="field-label" htmlFor="to">To</label>
          <input id="to" className="input-field" value={toQuery} onChange={(e) => setToQuery(e.target.value)} placeholder="Any city" />
        </div>
        <label className="flex items-center gap-2 pb-2.5 text-sm text-royal-600">
          <input type="checkbox" checked={directOnly} onChange={(e) => setDirectOnly(e.target.checked)} className="h-4 w-4 rounded border-surface-border text-royal-700" />
          Direct only
        </label>
        <div className="ml-auto">
          <label className="field-label" htmlFor="sort">Sort by</label>
          <select id="sort" className="input-field" value={sort} onChange={(e) => setSort(e.target.value as (typeof SORT_OPTIONS)[number])}>
            {SORT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {results.length === 0 ? (
          <div className="card p-10 text-center text-sm text-royal-500">No flights match your search. Try a different route.</div>
        ) : (
          results.map((f) => <FlightCard key={f.id} flight={f} />)
        )}
      </div>
    </div>
  );
}
