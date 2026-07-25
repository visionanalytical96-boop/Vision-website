import type { Metadata } from 'next';
import { StatCard, StatusPill } from '@/components/dashboard/DashboardShell';
import { partnerBookings } from '@/lib/mock-data';
import { formatDate, formatINR } from '@/lib/utils';

export const metadata: Metadata = { title: 'Partner Dashboard' };

export default function PartnerDashboardOverview() {
  const totalRevenue = partnerBookings.filter((b) => b.status !== 'Cancelled').reduce((s, b) => s + b.amount, 0);
  const occupancyRate = 78;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-royal-900">Royal Orchid Suites — Overview</h1>
        <p className="text-sm text-royal-500">Goa · 4 room categories · Approved property</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="This month's revenue" value={formatINR(totalRevenue)} tone="success" />
        <StatCard label="Active bookings" value={String(partnerBookings.filter((b) => b.status !== 'Cancelled').length)} />
        <StatCard label="Occupancy rate" value={`${occupancyRate}%`} tone="saffron" />
        <StatCard label="Avg. guest rating" value="4.6 / 5" />
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-base font-semibold text-royal-900">Recent bookings</h2>
        <div className="divide-y divide-surface-border">
          {partnerBookings.slice(0, 4).map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-semibold text-royal-900">{b.guestName}</p>
                <p className="text-xs text-royal-500">{b.roomType} · {formatDate(b.checkIn)} → {formatDate(b.checkOut)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-royal-900">{formatINR(b.amount)}</span>
                <StatusPill status={b.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5 text-sm text-royal-500">
        <p className="font-semibold text-royal-700">KYC status: Verified ✓</p>
        <p className="mt-1">PAN and GST details on file. Bank settlement account ending •••• 4821.</p>
      </div>
    </div>
  );
}
