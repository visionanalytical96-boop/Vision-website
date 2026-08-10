import type { Metadata } from 'next';
import Link from 'next/link';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { requireSession } from '@/lib/dal';
import { getEngineerJobHistory } from '@/lib/data/engineer';
import { formatDate } from '@/lib/format';
import { serviceRequestStatusMeta } from '@/lib/status';
import { SERVICE_REQUEST_TYPE_LABELS } from '@/lib/service-request-labels';

export const metadata: Metadata = { title: 'Job History' };

export default async function EngineerHistoryPage() {
  const session = await requireSession();
  const jobs = await getEngineerJobHistory(session.userId);

  if (jobs.length === 0) {
    return <EmptyState title="No completed jobs yet" description="Jobs you've completed or that were closed will appear here." />;
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Ticket #</TableHeaderCell>
          <TableHeaderCell>Customer</TableHeaderCell>
          <TableHeaderCell>Type</TableHeaderCell>
          <TableHeaderCell>Updated</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell />
        </TableRow>
      </TableHead>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell className="font-mono">{job.ticketNumber}</TableCell>
            <TableCell>{job.customer.companyName ?? job.customer.name}</TableCell>
            <TableCell>{SERVICE_REQUEST_TYPE_LABELS[job.type]}</TableCell>
            <TableCell>{formatDate(job.updatedAt)}</TableCell>
            <TableCell>
              <StatusBadge meta={serviceRequestStatusMeta[job.status]} />
            </TableCell>
            <TableCell>
              <Link href={`/engineer/jobs/${job.id}`} className="text-primary hover:underline dark:text-secondary">
                View
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
