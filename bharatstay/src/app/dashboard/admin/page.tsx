import type { Metadata } from 'next';
import { StatCard } from '@/components/dashboard/DashboardShell';
import { adminAnalytics } from '@/lib/mock-data';
import { formatINR } from '@/lib/utils';

export const metadata: Metadata = { title: 'Admin Analytics' };

export default function AdminOverviewPage() {
  const a = adminAnalytics;
  const maxDestBookings = Math.max(...a.topDestinations.map((d) => d.bookings));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-royal-900">Platform Analytics</h1>
        <p className="text-sm text-royal-500">Real-time snapshot across all booking verticals.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total bookings" value={a.totalBookings.toLocaleString('en-IN')} />
        <StatCard label="Total revenue" value={formatINR(a.totalRevenue)} tone="success" />
        <StatCard label="Net profit" value={formatINR(a.netProfit)} tone="success" />
        <StatCard label="Pending payments" value={formatINR(a.pendingPayments)} tone="saffron" />
        <StatCard label="Pending refunds" value={formatINR(a.pendingRefunds)} tone="saffron" />
        <StatCard label="Cancellation rate" value={`${a.cancellationRate}%`} />
        <StatCard label="Conversion rate" value={`${a.conversionRate}%`} />
        <StatCard label="Customer growth (MoM)" value="+8.4%" tone="success" />
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-base font-semibold text-royal-900">Top destinations by bookings</h2>
        <div className="space-y-3">
          {a.topDestinations.map((d) => (
            <div key={d.name}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium text-royal-800">{d.name}</span>
                <span className="text-royal-500">{d.bookings.toLocaleString('en-IN')} bookings</span>
              </div>
              <div className="h-2 w-full rounded-full bg-royal-50">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-royal-600 to-saffron-500"
                  style={{ width: `${(d.bookings / maxDestBookings) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
