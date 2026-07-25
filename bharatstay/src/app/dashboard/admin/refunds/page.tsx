import type { Metadata } from 'next';
import { adminRefundQueue } from '@/lib/mock-data';
import { RefundQueue } from '@/components/dashboard/RefundQueue';

export const metadata: Metadata = { title: 'Refunds & Cancellations' };

export default function AdminRefundsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-royal-900">Refunds &amp; Cancellations</h1>
        <p className="text-sm text-royal-500">
          Workflow: Requested → Under Review → Approved → Refund Initiated → Completed (or Rejected at any review point).
        </p>
      </div>
      <RefundQueue initialRows={adminRefundQueue} />
    </div>
  );
}
