import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { buttonVariants } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { listServiceReports } from '@/lib/data/service-reports';
import {
  SERVICE_CALL_TYPE_LABELS,
  SERVICE_CONTRACT_TYPE_LABELS,
  SERVICE_OUTCOME_LABELS,
} from '@/lib/service-report/form';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Service Reports' };

export default async function AdminServiceReportsPage() {
  const reports = await listServiceReports();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Service Reports</h2>
          <p className="mt-1 text-sm text-muted">
            The signed field report for each visit. Open one to download it as a PDF.
          </p>
        </div>
        <Link href="/admin/service-reports/new" className={buttonVariants()}>
          <Plus className="h-4 w-4" aria-hidden /> New report
        </Link>
      </div>

      {reports.length === 0 ? (
        <EmptyState
          title="No service reports yet"
          description="Generate one after a site visit and it will be listed here."
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Report #</TableHeaderCell>
              <TableHeaderCell>Customer</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Engineer</TableHeaderCell>
              <TableHeaderCell>Type of visit</TableHeaderCell>
              <TableHeaderCell>Billing</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id}>
                <TableCell className="font-mono">{report.reportNumber ?? '—'}</TableCell>
                <TableCell>{report.companyName ?? '—'}</TableCell>
                <TableCell>{formatDate(report.reportDate ?? report.reportedAt)}</TableCell>
                <TableCell>{report.engineer.name}</TableCell>
                <TableCell>
                  {report.serviceTypes.length > 0
                    ? report.serviceTypes.map((type) => SERVICE_CALL_TYPE_LABELS[type]).join(', ')
                    : '—'}
                </TableCell>
                <TableCell>
                  {report.contractType ? SERVICE_CONTRACT_TYPE_LABELS[report.contractType] : '—'}
                </TableCell>
                <TableCell>
                  {report.outcome ? (
                    <Badge tone={report.outcome === 'OK' ? 'success' : 'danger'}>
                      {SERVICE_OUTCOME_LABELS[report.outcome]}
                    </Badge>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/service-reports/${report.id}`}
                    className="text-primary hover:underline dark:text-secondary"
                  >
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
