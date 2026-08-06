import type { Metadata } from 'next';
import Link from 'next/link';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { getAdminServiceRequests } from '@/lib/data/admin-service-requests';
import { serviceRequestStatusMeta, priorityMeta } from '@/lib/status';
import { SERVICE_REQUEST_TYPE_LABELS } from '@/lib/service-request-labels';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Service Requests' };

export default async function AdminServiceRequestsPage() {
  const requests = await getAdminServiceRequests();

  if (requests.length === 0) {
    return <EmptyState title="No service requests yet" />;
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Ticket #</TableHeaderCell>
          <TableHeaderCell>Customer</TableHeaderCell>
          <TableHeaderCell>Type</TableHeaderCell>
          <TableHeaderCell>Engineer</TableHeaderCell>
          <TableHeaderCell>Raised</TableHeaderCell>
          <TableHeaderCell>Priority</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell />
        </TableRow>
      </TableHead>
      <TableBody>
        {requests.map((request) => (
          <TableRow key={request.id}>
            <TableCell className="font-mono">{request.ticketNumber}</TableCell>
            <TableCell>{request.customer.companyName ?? request.customer.name}</TableCell>
            <TableCell>{SERVICE_REQUEST_TYPE_LABELS[request.type]}</TableCell>
            <TableCell>{request.assignedEngineer?.name ?? 'Unassigned'}</TableCell>
            <TableCell>{formatDate(request.createdAt)}</TableCell>
            <TableCell>
              <StatusBadge meta={priorityMeta[request.priority]} />
            </TableCell>
            <TableCell>
              <StatusBadge meta={serviceRequestStatusMeta[request.status]} />
            </TableCell>
            <TableCell>
              <Link href={`/admin/service-requests/${request.id}`} className="text-blue-600 hover:underline dark:text-cyan-400">
                View
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
