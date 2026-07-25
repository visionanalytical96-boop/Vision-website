'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Logo } from '@/components/layout/Logo';
import { cn } from '@/lib/utils';

export interface DashboardNavItem {
  label: string;
  href: string;
  icon: string;
}

export function DashboardShell({
  navItems,
  roleLabel,
  userName,
  children,
}: {
  navItems: DashboardNavItem[];
  roleLabel: string;
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
              active ? 'bg-royal-700 text-white' : 'text-royal-600 hover:bg-royal-50',
            )}
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="sticky top-0 z-40 border-b border-surface-border bg-white">
        <div className="container-xl flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? '✕' : '☰'}
            </button>
            <Logo />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-royal-50 px-3 py-1 text-xs font-semibold text-royal-700 sm:inline">
              {roleLabel}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-saffron-500 text-sm font-bold text-white">
              {userName.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <div className="container-xl grid grid-cols-1 gap-6 py-6 lg:grid-cols-[240px_1fr]">
        <aside className={cn('lg:block', mobileOpen ? 'block' : 'hidden')}>
          <div className="card p-3">{nav}</div>
        </aside>
        <main className="min-w-0 space-y-6">{children}</main>
      </div>
    </div>
  );
}

export function StatCard({ label, value, hint, tone = 'royal' }: { label: string; value: string; hint?: string; tone?: 'royal' | 'success' | 'saffron' }) {
  const toneClass = {
    royal: 'text-royal-900',
    success: 'text-success-600',
    saffron: 'text-saffron-600',
  }[tone];

  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-royal-400">{label}</p>
      <p className={cn('mt-1 text-2xl font-bold', toneClass)}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-royal-400">{hint}</p> : null}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Upcoming: 'bg-royal-50 text-royal-700',
    Completed: 'bg-success-50 text-success-700',
    Cancelled: 'bg-red-50 text-red-600',
    'Pending Payment': 'bg-saffron-50 text-saffron-700',
    Confirmed: 'bg-success-50 text-success-700',
    'Checked In': 'bg-royal-50 text-royal-700',
    'Checked Out': 'bg-royal-100 text-royal-500',
    Pending: 'bg-saffron-50 text-saffron-700',
    Approved: 'bg-success-50 text-success-700',
    Rejected: 'bg-red-50 text-red-600',
    Success: 'bg-success-50 text-success-700',
    Failed: 'bg-red-50 text-red-600',
    Refunded: 'bg-royal-50 text-royal-700',
    Requested: 'bg-saffron-50 text-saffron-700',
    'Under Review': 'bg-royal-50 text-royal-700',
    'Refund Initiated': 'bg-royal-50 text-royal-700',
  };

  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', map[status] ?? 'bg-royal-50 text-royal-700')}>
      {status}
    </span>
  );
}
