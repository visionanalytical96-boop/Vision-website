import type { Metadata } from 'next';
import { StatusPill } from '@/components/dashboard/DashboardShell';
import { customerPayments, adminPaymentProofs } from '@/lib/mock-data';
import { formatDateTime, formatINR } from '@/lib/utils';
import { PaymentProofQueue } from '@/components/dashboard/PaymentProofQueue';

export const metadata: Metadata = { title: 'Payments & Offline Proofs' };

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-royal-900">Payments</h1>
        <p className="text-sm text-royal-500">Gateway transactions and offline/bank-transfer payment proof verification.</p>
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold text-royal-900">Recent gateway transactions</h2>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-royal-900">Offline payment proof verification</h2>
        <PaymentProofQueue initialRows={adminPaymentProofs} />
      </section>
    </div>
  );
}
