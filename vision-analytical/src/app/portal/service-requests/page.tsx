import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { buttonVariants } from '@/components/ui/Button';
import { getSession } from '@/lib/dal';
import { getCustomerServiceRequests } from '@/lib/data/portal';
import { formatDate } from '@/lib/format';
import { serviceRequestStatusMeta, priorityMeta } from '@/lib/status';
import { SERVICE_REQUEST_TYPE_LABELS } from '@/lib/service-request-labels';

export const metadata: Metadata = { title: 'Service Requests' };

export default async function PortalServiceRequestsPage() {
  const session = await getSession();
  if (!session) return null;

  const requests = await getCustomerServiceRequests(session.userId);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/portal/service-requests/new" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
          <Plus className="h-4 w-4" />
          New Request
        </Link>
      </div>

      {requests.length === 0 ? (
        <EmptyState title="No service requests yet" description="Raise a ticket for installation, maintenance or breakdown support." actionLabel="Raise a request" actionHref="/portal/service-requests/new" />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Ticket #</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Priority</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Engineer</TableHeaderCell>
              <TableHeaderCell>Raised</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-mono">{request.ticketNumber}</TableCell>
                <TableCell>{SERVICE_REQUEST_TYPE_LABELS[request.type]}</TableCell>
                <TableCell>
                  <StatusBadge meta={priorityMeta[request.priority]} />
                </TableCell>
                <TableCell>
                  <StatusBadge meta={serviceRequestStatusMeta[request.status]} />
                </TableCell>
                <TableCell>{request.assignedEngineer?.name ?? 'Unassigned'}</TableCell>
                <TableCell>{formatDate(request.createdAt)}</TableCell>
                <TableCell>
                  <Link href={`/portal/service-requests/${request.id}`} className="text-blue-600 hover:underline dark:text-cyan-400">
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
