'use client';

import { useState } from 'react';
import { StatusPill } from '@/components/dashboard/DashboardShell';
import type { AdminRefundRow } from '@/lib/mock-data/bookings';
import { formatDate, formatINR } from '@/lib/utils';

const FLOW: AdminRefundRow['status'][] = ['Requested', 'Under Review', 'Approved', 'Refund Initiated', 'Completed'];

function nextStatus(status: AdminRefundRow['status']): AdminRefundRow['status'] | null {
  const idx = FLOW.indexOf(status);
  if (idx === -1 || idx === FLOW.length - 1) return null;
  return FLOW[idx + 1] ?? null;
}

export function RefundQueue({ initialRows }: { initialRows: AdminRefundRow[] }) {
  const [rows, setRows] = useState(initialRows);

  function advance(id: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = nextStatus(r.status);
        return next ? { ...r, status: next } : r;
      }),
    );
  }

  function reject(id: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'Rejected' } : r)));
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-surface-border text-left text-xs uppercase text-royal-400">
            <th className="px-4 py-3">Booking Ref</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Reason</th>
            <th className="px-4 py-3">Requested</th>
            <th className="px-4 py-3 text-right">Amount</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {rows.map((r) => {
            const next = nextStatus(r.status);
            const isTerminal = r.status === 'Completed' || r.status === 'Rejected';
            return (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium text-royal-900">{r.bookingRef}</td>
                <td className="px-4 py-3 text-royal-600">{r.customerName}</td>
                <td className="px-4 py-3 text-royal-600">{r.reason}</td>
                <td className="px-4 py-3 text-royal-500">{formatDate(r.requestedOn)}</td>
                <td className="px-4 py-3 text-right font-semibold text-royal-900">{formatINR(r.amount)}</td>
                <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                <td className="px-4 py-3 text-right">
                  {isTerminal ? (
                    <span className="text-xs text-royal-400">Closed</span>
                  ) : (
                    <div className="flex justify-end gap-2">
                      {next ? (
                        <button type="button" onClick={() => advance(r.id)} className="rounded-md bg-royal-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-royal-800">
                          Move to {next}
                        </button>
                      ) : null}
                      <button type="button" onClick={() => reject(r.id)} className="rounded-md bg-red-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-600">
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
