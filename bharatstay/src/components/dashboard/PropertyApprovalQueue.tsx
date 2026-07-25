'use client';

import { useState } from 'react';
import { StatusPill } from '@/components/dashboard/DashboardShell';
import type { AdminPropertyRow } from '@/lib/mock-data/bookings';
import { formatDate } from '@/lib/utils';

export function PropertyApprovalQueue({ initialRows }: { initialRows: AdminPropertyRow[] }) {
  const [rows, setRows] = useState(initialRows);

  function setStatus(id: string, status: AdminPropertyRow['status']) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-surface-border text-left text-xs uppercase text-royal-400">
            <th className="px-4 py-3">Property</th>
            <th className="px-4 py-3">Partner</th>
            <th className="px-4 py-3">City</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Submitted</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 font-medium text-royal-900">{r.name}</td>
              <td className="px-4 py-3 text-royal-600">{r.partner}</td>
              <td className="px-4 py-3 text-royal-600">{r.city}</td>
              <td className="px-4 py-3 text-royal-600">{r.type}</td>
              <td className="px-4 py-3 text-royal-500">{formatDate(r.submittedOn)}</td>
              <td className="px-4 py-3"><StatusPill status={r.status} /></td>
              <td className="px-4 py-3 text-right">
                {r.status === 'Pending' ? (
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setStatus(r.id, 'Approved')} className="rounded-md bg-success-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-success-600">
                      Approve
                    </button>
                    <button type="button" onClick={() => setStatus(r.id, 'Rejected')} className="rounded-md bg-red-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-600">
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-royal-400">Reviewed</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
