import type { Metadata } from 'next';
import { StatCard } from '@/components/dashboard/DashboardShell';
import { partnerBookings } from '@/lib/mock-data';
import { formatINR } from '@/lib/utils';

export const metadata: Metadata = { title: 'Earnings & Settlement' };

const COMMISSION_RATE = 0.15;

export default function PartnerEarningsPage() {
  const gross = partnerBookings.filter((b) => b.status !== 'Cancelled').reduce((s, b) => s + b.amount, 0);
  const commission = Math.round(gross * COMMISSION_RATE);
  const net = gross - commission;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-royal-900">Earnings &amp; Settlement</h1>
        <p className="text-sm text-royal-500">Commission report and payout schedule for this billing cycle.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Gross booking value" value={formatINR(gross)} />
        <StatCard label="BharatStay commission (15%)" value={formatINR(commission)} tone="saffron" />
        <StatCard label="Net payable to you" value={formatINR(net)} tone="success" />
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-base font-semibold text-royal-900">Upcoming settlement</h2>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-royal-50 p-4">
          <div>
            <p className="text-sm font-semibold text-royal-800">Next payout — 01 Aug 2026</p>
            <p className="text-xs text-royal-500">To bank account ending •••• 4821 via NEFT</p>
          </div>
          <p className="text-lg font-bold text-royal-900">{formatINR(net)}</p>
        </div>
        <button type="button" className="btn-secondary mt-4 text-sm">Download Settlement Invoice</button>
      </div>
    </div>
  );
}
