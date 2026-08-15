'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ChevronDown } from 'lucide-react';
import { buttonVariants } from '@/components/ui/Button';
import { SearchForm } from '@/components/search/SearchForm';
import { cn } from '@/lib/utils';
import type { MegaMenuColumn } from './MegaMenu';

interface MobileNavProps {
  navLinks: { href: string; label: string }[];
  isAuthenticated: boolean;
  accountHref: string;
  megaColumns: MegaMenuColumn[];
  megaMenuHref: string;
  showRequestQuote: boolean;
}

export function MobileNav({
  navLinks,
  isAuthenticated,
  accountHref,
  megaColumns,
  megaMenuHref,
  showRequestQuote,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  // The catalogue nests three columns; keeping it collapsed by default stops
  // the sheet opening two screens tall.
  const [catalogueOpen, setCatalogueOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-surface-muted"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-16 z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-border bg-background px-4 py-4 shadow-lg">
          <SearchForm className="mb-4" />

          <nav className="flex flex-col gap-1">
            {navLinks.map((link) =>
              link.href === megaMenuHref ? (
                <div key={link.href}>
                  <button
                    type="button"
                    aria-expanded={catalogueOpen}
                    onClick={() => setCatalogueOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-muted"
                  >
                    {link.label}
                    <ChevronDown className={cn('h-4 w-4 transition-transform', catalogueOpen && 'rotate-180')} aria-hidden />
                  </button>

                  {catalogueOpen && (
                    <div className="space-y-4 border-l border-border pb-2 pl-3 ml-3">
                      {megaColumns.map((column) => (
                        <div key={column.title}>
                          <p className="px-3 pt-2 text-xs font-medium uppercase tracking-[0.1em] text-muted">
                            {column.title}
                          </p>
                          <ul>
                            {column.items.map((item) => (
                              <li key={item.href}>
                                <Link
                                  href={item.href}
                                  onClick={() => setOpen(false)}
                                  className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-surface-muted"
                                >
                                  {item.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-muted"
                >
                  {link.label}
                </Link>
              ),
            )}

            {showRequestQuote && (
              <Link
                href="/request-quote"
                onClick={() => setOpen(false)}
                className={buttonVariants({ variant: 'primary', className: 'mt-2 justify-center' })}
              >
                Request Quote
              </Link>
            )}
            <Link
              href={accountHref}
              onClick={() => setOpen(false)}
              className={buttonVariants({ variant: 'outline', className: 'justify-center' })}
            >
              {isAuthenticated ? 'My Account' : 'Login'}
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
