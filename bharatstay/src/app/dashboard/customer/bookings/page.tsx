'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { StatusPill } from '@/components/dashboard/DashboardShell';
import { customerBookings } from '@/lib/mock-data';
import { formatDate, formatINR } from '@/lib/utils';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';

const TABS = ['All', 'Upcoming', 'Completed', 'Cancelled', 'Pending Payment'] as const;

export default function CustomerBookingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('All');

  const filtered = useMemo(
    () => (tab === 'All' ? customerBookings : customerBookings.filter((b) => b.status === tab)),
    [tab],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-royal-900">My Bookings</h1>
        <p className="text-sm text-royal-500">Manage upcoming, completed and cancelled bookings across all verticals.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
              tab === t ? 'border-royal-700 bg-royal-700 text-white' : 'border-surface-border text-royal-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((b) => (
          <div key={b.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <PlaceholderImage token={b.image} className="h-20 w-full rounded-lg sm:w-28" emojiClassName="text-2xl" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-royal-900">{b.title}</p>
                <StatusPill status={b.status} />
              </div>
              <p className="text-xs text-royal-500">{b.subtitle}</p>
              <p className="mt-1 text-xs text-royal-400">Booking ref: {b.bookingRef} · {formatDate(b.date)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-royal-900">{formatINR(b.amountPaid)}</p>
              {b.amountPaid < b.totalAmount ? (
                <p className="text-xs text-saffron-600">Balance {formatINR(b.totalAmount - b.amountPaid)}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                <Link href={`/vouchers/hotel/${b.bookingRef}?amount=${b.amountPaid}&property=${encodeURIComponent(b.title)}`} className="btn-secondary text-xs">
                  Ticket
                </Link>
                <Link href={`/vouchers/receipt/${b.bookingRef}?amount=${b.amountPaid}`} className="btn-secondary text-xs">
                  Invoice
                </Link>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 ? <p className="card p-8 text-center text-sm text-royal-400">No bookings in this category.</p> : null}
      </div>
    </div>
  );
}
