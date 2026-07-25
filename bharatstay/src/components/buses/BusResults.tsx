'use client';

import { useMemo, useState } from 'react';
import { busRoutes as allBuses } from '@/lib/mock-data';
import { BusCard } from './BusCard';

const SORT_OPTIONS = ['Price: Low to High', 'Price: High to Low', 'Rating', 'Departure Time'] as const;

export function BusResults({ from, to }: { from?: string; to?: string }) {
  const [fromQuery, setFromQuery] = useState(from ?? '');
  const [toQuery, setToQuery] = useState(to ?? '');
  const [acOnly, setAcOnly] = useState(false);
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]>('Price: Low to High');

  const results = useMemo(() => {
    let list = allBuses.filter((b) => {
      if (fromQuery && !b.fromCity.toLowerCase().includes(fromQuery.toLowerCase())) return false;
      if (toQuery && !b.toCity.toLowerCase().includes(toQuery.toLowerCase())) return false;
      if (acOnly && !b.isAc) return false;
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
      case 'Rating':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'Departure Time':
        list.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
        break;
      default:
        break;
    }
    return list;
  }, [fromQuery, toQuery, acOnly, sort]);

  return (
    <div className="container-xl py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-royal-900">Bus Search Results</h1>
        <p className="text-sm text-royal-500">{results.length} buses found</p>
      </div>

      <div className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="field-label" htmlFor="bus-from">From</label>
          <input id="bus-from" className="input-field" value={fromQuery} onChange={(e) => setFromQuery(e.target.value)} placeholder="Any city" />
        </div>
        <div>
          <label className="field-label" htmlFor="bus-to">To</label>
          <input id="bus-to" className="input-field" value={toQuery} onChange={(e) => setToQuery(e.target.value)} placeholder="Any city" />
        </div>
        <label className="flex items-center gap-2 pb-2.5 text-sm text-royal-600">
          <input type="checkbox" checked={acOnly} onChange={(e) => setAcOnly(e.target.checked)} className="h-4 w-4 rounded border-surface-border text-royal-700" />
          AC only
        </label>
        <div className="ml-auto">
          <label className="field-label" htmlFor="bus-sort">Sort by</label>
          <select id="bus-sort" className="input-field" value={sort} onChange={(e) => setSort(e.target.value as (typeof SORT_OPTIONS)[number])}>
            {SORT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {results.length === 0 ? (
          <div className="card p-10 text-center text-sm text-royal-500">No buses match your search. Try a different route.</div>
        ) : (
          results.map((b) => <BusCard key={b.id} bus={b} />)
        )}
      </div>
    </div>
  );
}
