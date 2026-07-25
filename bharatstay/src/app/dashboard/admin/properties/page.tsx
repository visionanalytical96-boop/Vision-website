import type { Metadata } from 'next';
import { adminPropertyQueue } from '@/lib/mock-data';
import { PropertyApprovalQueue } from '@/components/dashboard/PropertyApprovalQueue';

export const metadata: Metadata = { title: 'Property Approvals' };

export default function AdminPropertiesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-royal-900">Property Approval Queue</h1>
        <p className="text-sm text-royal-500">New partner property listings require admin verification before going live.</p>
      </div>
      <PropertyApprovalQueue initialRows={adminPropertyQueue} />
    </div>
  );
}
