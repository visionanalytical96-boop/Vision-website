'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Logo } from './Logo';

const NAV_LINKS = [
  { label: 'Hotels', href: '/hotels' },
  { label: 'Flights', href: '/flights' },
  { label: 'Buses', href: '/buses' },
  { label: 'Trains', href: '/trains' },
  { label: 'Cabs', href: '/cabs' },
  { label: 'Holiday Packages', href: '/packages' },
  { label: 'Activities', href: '/activities' },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [language, setLanguage] = useState('English');
  const [currency, setCurrency] = useState('INR ₹');

  return (
    <header className="sticky top-0 z-50 border-b border-surface-border bg-white/95 backdrop-blur">
      <div className="border-b border-surface-border bg-royal-800 text-white">
        <div className="container-xl flex h-9 items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <Link href="/list-your-property" className="hover:text-saffron-300">
              List Your Property
            </Link>
            <Link href="/corporate-travel" className="hidden hover:text-saffron-300 sm:inline">
              Corporate Travel
            </Link>
            <Link href="/agent/login" className="hidden hover:text-saffron-300 sm:inline">
              Travel Agent Login
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <select
              aria-label="Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="cursor-pointer rounded bg-transparent text-xs text-white outline-none"
            >
              <option className="text-royal-900">English</option>
              <option className="text-royal-900">हिन्दी</option>
              <option className="text-royal-900">தமிழ்</option>
              <option className="text-royal-900">বাংলা</option>
            </select>
            <span className="text-white/40">|</span>
            <select
              aria-label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="cursor-pointer rounded bg-transparent text-xs text-white outline-none"
            >
              <option className="text-royal-900">INR ₹</option>
              <option className="text-royal-900">USD $</option>
              <option className="text-royal-900">EUR €</option>
              <option className="text-royal-900">AED د.إ</option>
            </select>
          </div>
        </div>
      </div>

      <div className="container-xl flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="btn-ghost">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/support" className="btn-ghost">
            Support
          </Link>
          <Link href="/dashboard/customer/bookings" className="btn-ghost">
            My Bookings
          </Link>
          <Link href="/login" className="btn-secondary">
            Login / Sign Up
          </Link>
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-surface-border lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span className="text-xl">{mobileOpen ? '✕' : '☰'}</span>
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-surface-border bg-white lg:hidden">
          <div className="container-xl flex flex-col gap-1 py-3">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-lg px-3 py-2 text-sm font-medium text-royal-700 hover:bg-royal-50">
                {link.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-surface-border" />
            <Link href="/list-your-property" className="rounded-lg px-3 py-2 text-sm font-medium text-royal-700 hover:bg-royal-50">List Your Property</Link>
            <Link href="/corporate-travel" className="rounded-lg px-3 py-2 text-sm font-medium text-royal-700 hover:bg-royal-50">Corporate Travel</Link>
            <Link href="/support" className="rounded-lg px-3 py-2 text-sm font-medium text-royal-700 hover:bg-royal-50">Customer Support</Link>
            <Link href="/dashboard/customer/bookings" className="rounded-lg px-3 py-2 text-sm font-medium text-royal-700 hover:bg-royal-50">My Bookings</Link>
            <Link href="/login" className="btn-primary mt-2 justify-center">Login / Sign Up</Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
