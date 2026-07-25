import type { Metadata } from 'next';
import Link from 'next/link';
import { StatusPill } from '@/components/dashboard/DashboardShell';
import { customerPayments } from '@/lib/mock-data';
import { formatDateTime, formatINR } from '@/lib/utils';

export const metadata: Metadata = { title: 'Payments & Receipts' };

export default function CustomerPaymentsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-royal-900">Payment History</h1>
        <p className="text-sm text-royal-500">Track transactions and download GST receipts for every payment.</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-surface-border text-left text-xs uppercase text-royal-400">
              <th className="px-4 py-3">Transaction ID</th>
              <th className="px-4 py-3">Booking Ref</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {customerPayments.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-medium text-royal-900">{p.transactionId}</td>
                <td className="px-4 py-3 text-royal-600">{p.bookingRef}</td>
                <td className="px-4 py-3 text-royal-600">{p.method}</td>
                <td className="px-4 py-3 text-royal-500">{formatDateTime(p.date)}</td>
                <td className="px-4 py-3"><StatusPill status={p.status} /></td>
                <td className="px-4 py-3 text-right font-semibold text-royal-900">{formatINR(p.amount)}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/vouchers/receipt/${p.bookingRef}?amount=${p.amount}&method=${p.method}`} className="text-xs font-semibold text-royal-700 hover:text-saffron-600">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
