import type { Metadata } from 'next';
import { StatusPill } from '@/components/dashboard/DashboardShell';
import { customerBookings } from '@/lib/mock-data';
import { formatDate, formatINR } from '@/lib/utils';

export const metadata: Metadata = { title: 'All Bookings' };

export default function AdminBookingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-royal-900">All Bookings</h1>
        <p className="text-sm text-royal-500">Platform-wide bookings across hotels, flights, buses, cabs and packages.</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-surface-border text-left text-xs uppercase text-royal-400">
              <th className="px-4 py-3">Booking Ref</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {customerBookings.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3 font-medium text-royal-900">{b.bookingRef}</td>
                <td className="px-4 py-3 text-royal-600">{b.type}</td>
                <td className="px-4 py-3 text-royal-600">{b.title}</td>
                <td className="px-4 py-3 text-royal-500">{formatDate(b.date)}</td>
                <td className="px-4 py-3"><StatusPill status={b.status} /></td>
                <td className="px-4 py-3 text-right font-semibold text-royal-900">{formatINR(b.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
