import type { Metadata } from 'next';
import { StatusPill } from '@/components/dashboard/DashboardShell';
import { partnerBookings } from '@/lib/mock-data';
import { formatDate, formatINR } from '@/lib/utils';

export const metadata: Metadata = { title: 'Partner Bookings' };

export default function PartnerBookingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-royal-900">Booking Management</h1>
        <p className="text-sm text-royal-500">All guest bookings for your properties.</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-surface-border text-left text-xs uppercase text-royal-400">
              <th className="px-4 py-3">Booking Ref</th>
              <th className="px-4 py-3">Guest</th>
              <th className="px-4 py-3">Room Type</th>
              <th className="px-4 py-3">Check-in</th>
              <th className="px-4 py-3">Check-out</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {partnerBookings.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3 font-medium text-royal-900">{b.bookingRef}</td>
                <td className="px-4 py-3 text-royal-600">{b.guestName}</td>
                <td className="px-4 py-3 text-royal-600">{b.roomType}</td>
                <td className="px-4 py-3 text-royal-500">{formatDate(b.checkIn)}</td>
                <td className="px-4 py-3 text-royal-500">{formatDate(b.checkOut)}</td>
                <td className="px-4 py-3"><StatusPill status={b.status} /></td>
                <td className="px-4 py-3 text-right font-semibold text-royal-900">{formatINR(b.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
