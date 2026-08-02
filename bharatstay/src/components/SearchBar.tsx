'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** One box, one job: find a stay or a restaurant by name, city or area. */
export function SearchBar({ defaultValue = '', autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);

  return (
    <form
      className="flex w-full gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/stays');
      }}
    >
      <label className="sr-only" htmlFor="site-search">
        Search stays and restaurants
      </label>
      <input
        id="site-search"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Badlapur farmhouse, Karjat villa, misal near me…"
        className="flex-1 rounded-xl border px-4 py-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--monsoon)_18%,transparent)]"
        style={{ background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)' }}
      />
      <button type="submit" className="btn btn-primary shrink-0">
        Search
      </button>
    </form>
  );
}
