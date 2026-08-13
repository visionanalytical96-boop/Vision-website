import type { Metadata } from 'next';
import Link from 'next/link';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { requireSession } from '@/lib/dal';
import { getEngineerVisitHistory } from '@/lib/data/engineer-visits';
import { formatDate } from '@/lib/format';
import { visitStatusMeta } from '@/lib/service-visit';
import { SERVICE_REQUEST_TYPE_LABELS } from '@/lib/service-request-labels';

export const metadata: Metadata = { title: 'Job History' };

export default async function EngineerHistoryPage() {
  const session = await requireSession();
  const visits = await getEngineerVisitHistory(session.userId);

  if (visits.length === 0) {
    return <EmptyState title="No finished jobs yet" description="Jobs you have closed will appear here." />;
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Visit #</TableHeaderCell>
          <TableHeaderCell>Customer</TableHeaderCell>
          <TableHeaderCell>Type</TableHeaderCell>
          <TableHeaderCell>Finished</TableHeaderCell>
          <TableHeaderCell>Outcome</TableHeaderCell>
          <TableHeaderCell />
        </TableRow>
      </TableHead>
      <TableBody>
        {visits.map((visit) => (
          <TableRow key={visit.id}>
            <TableCell className="font-mono">{visit.visitNumber}</TableCell>
            <TableCell>{visit.serviceRequest.customer.companyName ?? visit.serviceRequest.customer.name}</TableCell>
            <TableCell>{SERVICE_REQUEST_TYPE_LABELS[visit.serviceRequest.type]}</TableCell>
            <TableCell>{formatDate(visit.closedAt ?? visit.updatedAt)}</TableCell>
            <TableCell>
              <Badge tone={visitStatusMeta[visit.status].tone}>{visitStatusMeta[visit.status].label}</Badge>
            </TableCell>
            <TableCell>
              <Link href={`/engineer/jobs/${visit.id}`} className="text-primary hover:underline dark:text-secondary">
                View
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
