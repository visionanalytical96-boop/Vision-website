'use client';

import { useMemo, useState } from 'react';
import { hotels as allHotels } from '@/lib/mock-data';
import { FilterSidebar, DEFAULT_FILTERS, type HotelFilters } from './FilterSidebar';
import { HotelCard } from './HotelCard';

const SORT_OPTIONS = [
  'Recommended',
  'Price: Low to High',
  'Price: High to Low',
  'Top Rated',
  'Most Reviewed',
  'Distance',
  'Highest Discount',
] as const;

export function HotelResults({ destination, propertyType }: { destination?: string; propertyType?: string }) {
  const [filters, setFilters] = useState<HotelFilters>({
    ...DEFAULT_FILTERS,
    propertyTypes: propertyType ? [propertyType] : [],
  });
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]>('Recommended');
  const [query, setQuery] = useState(destination ?? '');

  const results = useMemo(() => {
    let list = allHotels.filter((h) => {
      if (query && !`${h.city} ${h.state} ${h.name}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (h.finalPrice > filters.maxPrice) return false;
      if (filters.starRatings.length && !filters.starRatings.includes(h.starRating)) return false;
      if (filters.minCustomerRating && h.customerRating < filters.minCustomerRating) return false;
      if (filters.propertyTypes.length && !filters.propertyTypes.includes(h.type)) return false;
      if (filters.amenities.length && !filters.amenities.every((a) => h.amenities.includes(a))) return false;
      if (filters.freeCancellation && !h.freeCancellation) return false;
      if (filters.payAtHotel && !h.payAtHotel) return false;
      if (filters.coupleFriendly && !h.isCoupleFriendly) return false;
      if (filters.familyFriendly && !h.isFamilyFriendly) return false;
      return true;
    });

    list = [...list];
    switch (sort) {
      case 'Price: Low to High':
        list.sort((a, b) => a.finalPrice - b.finalPrice);
        break;
      case 'Price: High to Low':
        list.sort((a, b) => b.finalPrice - a.finalPrice);
        break;
      case 'Top Rated':
        list.sort((a, b) => b.customerRating - a.customerRating);
        break;
      case 'Most Reviewed':
        list.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case 'Distance':
        list.sort((a, b) => a.distanceFromCentreKm - b.distanceFromCentreKm);
        break;
      case 'Highest Discount':
        list.sort((a, b) => b.discountPercent - a.discountPercent);
        break;
      default:
        break;
    }
    return list;
  }, [query, filters, sort]);

  return (
    <div className="container-xl py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-royal-900">
            {query ? `Hotels & Stays in ${query}` : 'Search Results'}
          </h1>
          <p className="text-sm text-royal-500">{results.length} properties found</p>
        </div>
        <div className="flex flex-1 gap-2 sm:max-w-md">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city or property"
            className="input-field"
          />
          <select value={sort} onChange={(e) => setSort(e.target.value as (typeof SORT_OPTIONS)[number])} className="input-field w-44 shrink-0">
            {SORT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <FilterSidebar filters={filters} onChange={setFilters} />
        <div className="space-y-5">
          {results.length === 0 ? (
            <div className="card p-10 text-center text-sm text-royal-500">
              No properties match your filters. Try clearing some filters.
            </div>
          ) : (
            results.map((hotel) => <HotelCard key={hotel.id} hotel={hotel} />)
          )}
        </div>
      </div>
    </div>
  );
}
