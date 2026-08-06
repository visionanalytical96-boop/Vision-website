import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ServiceReportForm } from '@/components/forms/ServiceReportForm';
import { requireSession } from '@/lib/dal';
import { getEngineerJobById } from '@/lib/data/engineer';
import { updateJobStatus } from '@/lib/actions/engineer';
import { formatDateTime } from '@/lib/format';
import { serviceRequestStatusMeta, priorityMeta } from '@/lib/status';
import { SERVICE_REQUEST_TYPE_LABELS } from '@/lib/service-request-labels';
import { ServiceRequestStatus } from '@/generated/prisma/enums';

export const metadata: Metadata = { title: 'Job Detail' };

const ENGINEER_SETTABLE_STATUSES = [ServiceRequestStatus.ASSIGNED, ServiceRequestStatus.IN_PROGRESS, ServiceRequestStatus.COMPLETED];

function isPartsUsedList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export default async function EngineerJobDetailPage(props: PageProps<'/engineer/jobs/[id]'>) {
  const { id } = await props.params;
  const session = await requireSession();
  const job = await getEngineerJobById(session.userId, id);
  if (!job) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted">{job.ticketNumber}</p>
          <p className="mt-1 text-sm text-foreground">{SERVICE_REQUEST_TYPE_LABELS[job.type]}</p>
          <p className="text-xs text-muted">Raised {formatDateTime(job.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge meta={priorityMeta[job.priority]} />
          <StatusBadge meta={serviceRequestStatusMeta[job.status]} />
          <form action={updateJobStatus} className="flex items-center gap-2">
            <input type="hidden" name="jobId" value={job.id} />
            <Select name="status" defaultValue={job.status} className="h-9 w-36 text-sm">
              {ENGINEER_SETTABLE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {serviceRequestStatusMeta[status].label}
                </option>
              ))}
            </Select>
            <Button type="submit" size="sm" variant="outline">
              Set
            </Button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Instrument &amp; issue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted">Instrument</p>
              <p className="text-foreground">{job.instrumentDescription}</p>
            </div>
            <div>
              <p className="text-muted">Description</p>
              <p className="text-foreground">{job.description}</p>
            </div>
            {job.amcContract && (
              <div>
                <p className="text-muted">Contract</p>
                <p className="text-foreground">
                  {job.amcContract.contractNumber} ({job.amcContract.type}) · {job.amcContract.visitsUsed}/{job.amcContract.visitsIncluded} visits used
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted">Name</p>
              <p className="text-foreground">{job.customer.companyName ?? job.customer.name}</p>
              {job.customer.companyName && <p className="text-xs text-muted">Attn: {job.customer.name}</p>}
            </div>
            {job.customer.phone && (
              <div>
                <p className="text-muted">Phone</p>
                <p className="text-foreground">{job.customer.phone}</p>
              </div>
            )}
            <div>
              <p className="text-muted">Email</p>
              <p className="text-foreground">{job.customer.email}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visit reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ServiceReportForm jobId={job.id} />

          {job.reports.length === 0 ? (
            <p className="text-sm text-muted">No reports submitted yet.</p>
          ) : (
            <ul className="space-y-4 border-t border-border pt-4">
              {job.reports.map((report) => (
                <li key={report.id} className="text-sm">
                  <p className="text-xs text-muted">{formatDateTime(report.reportedAt)}</p>
                  <p className="mt-1 text-foreground">{report.workPerformed}</p>
                  {isPartsUsedList(report.partsUsed) && report.partsUsed.length > 0 && (
                    <p className="mt-1 text-xs text-muted">Parts used: {report.partsUsed.join(', ')}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
