'use client';

import { useMemo, useState } from 'react';
import { cabOptions } from '@/lib/mock-data';
import { CabCard } from './CabCard';

const CATEGORIES = ['All', 'Hatchback', 'Sedan', 'SUV', 'Luxury', 'Tempo Traveller'] as const;

export function CabResults({ tripCategory, pickup, drop }: { tripCategory?: string; pickup?: string; drop?: string }) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All');

  const results = useMemo(
    () => (category === 'All' ? cabOptions : cabOptions.filter((c) => c.category === category)),
    [category],
  );

  return (
    <div className="container-xl py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-royal-900">Cab Search Results</h1>
        <p className="text-sm text-royal-500">
          {tripCategory ?? 'Local'} · {pickup ?? 'Pickup location'} {drop ? `→ ${drop}` : ''}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
              category === c ? 'border-royal-700 bg-royal-700 text-white' : 'border-surface-border text-royal-600'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {results.map((c) => (
          <CabCard key={c.id} cab={c} />
        ))}
      </div>
    </div>
  );
}
