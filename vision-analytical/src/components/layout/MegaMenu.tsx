'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { resolveIcon } from '@/lib/cms/icons';
import { cn } from '@/lib/utils';

export interface MegaMenuColumn {
  title: string;
  /** Where the column header itself points, when it has its own page. */
  href?: string;
  items: { label: string; href: string; description?: string; iconKey?: string }[];
}

/**
 * The catalogue panel. Three axes, because that is how buyers actually arrive:
 * they know the technique, they know the brand, or they know what stage of the
 * instrument's life they're solving for.
 */
export function MegaMenu({ label, href, columns }: { label: string; href: string; columns: MegaMenuColumn[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="static"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      // Closes when focus leaves the trigger and the whole panel, so keyboard
      // users tabbing past it don't leave it open behind them.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      {/*
        A link, not a disclosure button: the panel opens on hover and on focus,
        so a click that would otherwise toggle shut the panel the hover just
        opened instead does the useful thing and goes to the catalogue. Nothing
        lives only inside the panel - every link in it is also reachable from
        /products and /brands - so no content is hover-gated.
      */}
      <Link
        href={href}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(false)}
        className="flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        {label}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
      </Link>

      {open && (
        <div className="absolute inset-x-0 top-full border-b border-border bg-background shadow-lg">
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
            {columns.map((column) => (
              <div key={column.title}>
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted">{column.title}</p>
                <ul className="mt-4 space-y-1">
                  {column.items.map((item) => {
                    const Icon = item.iconKey ? resolveIcon(item.iconKey) : null;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-surface-muted"
                        >
                          {Icon ? (
                            <Icon className="mt-0.5 h-4 w-4 flex-none text-primary dark:text-secondary" aria-hidden />
                          ) : null}
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-foreground">{item.label}</span>
                            {item.description ? (
                              <span className="mt-0.5 block text-xs text-muted">{item.description}</span>
                            ) : null}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                {column.href ? (
                  <Link
                    href={column.href}
                    onClick={() => setOpen(false)}
                    className="mt-3 inline-block px-2 text-sm font-medium text-primary hover:underline dark:text-secondary"
                  >
                    View all →
                  </Link>
                ) : null}
              </div>
            ))}
          </div>

          <div className="border-t border-border bg-surface-muted">
            <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-primary hover:underline dark:text-secondary"
              >
                Browse the full catalogue →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
