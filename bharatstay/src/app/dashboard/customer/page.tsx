import Link from 'next/link';
import type { Metadata } from 'next';
import { StatCard, StatusPill } from '@/components/dashboard/DashboardShell';
import { customerBookings, customerPayments } from '@/lib/mock-data';
import { formatDate, formatINR } from '@/lib/utils';

export const metadata: Metadata = { title: 'Customer Dashboard' };

export default function CustomerDashboardOverview() {
  const upcoming = customerBookings.filter((b) => b.status === 'Upcoming');
  const totalSpent = customerPayments.filter((p) => p.status === 'Success').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-royal-900">Welcome back, Ananya 👋</h1>
        <p className="text-sm text-royal-500">Here&rsquo;s a snapshot of your travel with BharatStay.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Upcoming trips" value={String(upcoming.length)} />
        <StatCard label="Total bookings" value={String(customerBookings.length)} />
        <StatCard label="Total spent" value={formatINR(totalSpent)} tone="success" />
        <StatCard label="Coupon wallet" value="3 coupons" tone="saffron" />
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-royal-900">Upcoming bookings</h2>
          <Link href="/dashboard/customer/bookings" className="text-sm font-medium text-royal-700 hover:text-saffron-600">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-surface-border">
          {upcoming.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-semibold text-royal-900">{b.title}</p>
                <p className="text-xs text-royal-500">{b.subtitle} · {formatDate(b.date)}</p>
              </div>
              <StatusPill status={b.status} />
            </div>
          ))}
          {upcoming.length === 0 ? <p className="py-6 text-center text-sm text-royal-400">No upcoming bookings.</p> : null}
        </div>
      </div>
    </div>
  );
}
