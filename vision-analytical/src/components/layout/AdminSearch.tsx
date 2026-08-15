'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CornerDownLeft } from 'lucide-react';
import { searchAdmin } from '@/lib/admin-search';

const MAX_RESULTS = 7;

/**
 * Find any admin screen by typing what you call it.
 *
 * With sixty-odd pages across three sidebar groups, remembering which group
 * holds "attendance rules" is its own task. Typing beats hunting, and typing
 * the word you already have in your head beats learning ours — the index
 * carries the synonyms, so "colour", "logo" and "font" all reach Theme.
 *
 * Runs entirely in the browser. The index is small and static, so a keystroke
 * costs nothing and works with a slow connection to the server.
 */
export function AdminSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchAdmin(query).slice(0, MAX_RESULTS), [query]);

  // Derived rather than stored: after a keystroke the old highlight may point
  // past the end of a shorter list, and Enter would then go nowhere.
  const activeIndex = results.length === 0 ? -1 : Math.min(highlighted, results.length - 1);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd+K from anywhere, the shortcut people already expect.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setQuery('');
    router.push(href);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <label htmlFor="admin-search" className="sr-only">
        Search admin pages
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          ref={inputRef}
          id="admin-search"
          type="search"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="admin-search-results"
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          placeholder="Search pages and settings…"
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlighted(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setHighlighted((current) => Math.min(current + 1, results.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setHighlighted((current) => Math.max(current - 1, 0));
            } else if (event.key === 'Enter' && activeIndex >= 0) {
              event.preventDefault();
              go(results[activeIndex].href);
            }
          }}
          className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-14 text-sm text-foreground placeholder:text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted sm:block">
          Ctrl K
        </kbd>
      </div>

      {open && query.trim().length > 0 && (
        <div
          id="admin-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
        >
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">
              Nothing matches “{query}”. Try the word you would say out loud — “colour”, “fingerprint”, “chutti”.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((result, index) => (
                <li key={result.href}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    onPointerEnter={() => setHighlighted(index)}
                    onClick={() => go(result.href)}
                    className={`flex w-full items-start gap-3 px-4 py-2.5 text-left ${
                      index === activeIndex ? 'bg-surface-muted' : ''
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{result.title}</span>
                      <span className="block truncate text-xs text-muted">{result.description}</span>
                    </span>
                    <span className="shrink-0 pt-0.5 text-[10px] uppercase tracking-wide text-muted">
                      {result.section}
                    </span>
                    {index === activeIndex && <CornerDownLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
