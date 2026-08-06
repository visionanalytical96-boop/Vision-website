import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { getAdminServiceRequestById } from '@/lib/data/admin-service-requests';
import { getEngineerOptions } from '@/lib/data/admin-engineers';
import { updateServiceRequestStatus, assignEngineer } from '@/lib/actions/admin-service-requests';
import { formatDateTime } from '@/lib/format';
import { serviceRequestStatusMeta, priorityMeta } from '@/lib/status';
import { SERVICE_REQUEST_TYPE_LABELS } from '@/lib/service-request-labels';
import { ServiceRequestStatus } from '@/generated/prisma/enums';

export const metadata: Metadata = { title: 'Service Request Detail' };

function isPartsUsedList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export default async function AdminServiceRequestDetailPage(props: PageProps<'/admin/service-requests/[id]'>) {
  const { id } = await props.params;
  const [request, engineers] = await Promise.all([getAdminServiceRequestById(id), getEngineerOptions()]);
  if (!request) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted">{request.ticketNumber}</p>
          <p className="mt-1 text-sm text-foreground">
            {request.customer.companyName ?? request.customer.name} · {SERVICE_REQUEST_TYPE_LABELS[request.type]}
          </p>
          <p className="text-xs text-muted">Raised {formatDateTime(request.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge meta={priorityMeta[request.priority]} />
          <StatusBadge meta={serviceRequestStatusMeta[request.status]} />
          <form action={updateServiceRequestStatus} className="flex items-center gap-2">
            <input type="hidden" name="requestId" value={request.id} />
            <Select name="status" defaultValue={request.status} className="h-9 w-40 text-sm">
              {Object.values(ServiceRequestStatus).map((status) => (
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
              <p className="text-foreground">{request.instrumentDescription}</p>
            </div>
            <div>
              <p className="text-muted">Description</p>
              <p className="text-foreground">{request.description}</p>
            </div>
            {request.amcContract && (
              <div>
                <p className="text-muted">Contract</p>
                <p className="text-foreground">
                  {request.amcContract.contractNumber} ({request.amcContract.type}) · {request.amcContract.visitsUsed}/{request.amcContract.visitsIncluded} visits used
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
              <p className="text-foreground">{request.customer.companyName ?? request.customer.name}</p>
              {request.customer.companyName && <p className="text-xs text-muted">Attn: {request.customer.name}</p>}
            </div>
            {request.customer.phone && (
              <div>
                <p className="text-muted">Phone</p>
                <p className="text-foreground">{request.customer.phone}</p>
              </div>
            )}
            <div>
              <p className="text-muted">Email</p>
              <p className="text-foreground">{request.customer.email}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={assignEngineer} className="flex items-center gap-2">
            <input type="hidden" name="requestId" value={request.id} />
            <Select name="engineerId" defaultValue={request.assignedEngineer?.id ?? ''} className="h-9 text-sm">
              <option value="">Unassigned</option>
              {engineers.map((engineer) => (
                <option key={engineer.id} value={engineer.id}>
                  {engineer.name}
                </option>
              ))}
            </Select>
            <Button type="submit" size="sm" variant="outline">
              Assign
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visit reports</CardTitle>
        </CardHeader>
        <CardContent>
          {request.reports.length === 0 ? (
            <p className="text-sm text-muted">No reports submitted yet.</p>
          ) : (
            <ul className="space-y-4">
              {request.reports.map((report) => (
                <li key={report.id} className="border-b border-border pb-4 text-sm last:border-0 last:pb-0">
                  <p className="text-xs text-muted">
                    {formatDateTime(report.reportedAt)} · {report.engineer.name}
                  </p>
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

      {request.amcContract && (
        <p className="text-sm text-muted">
          Linked to AMC/CMC contract{' '}
          <Link href={`/admin/amc/${request.amcContract.id}`} className="font-mono text-blue-600 hover:underline dark:text-cyan-400">
            {request.amcContract.contractNumber}
          </Link>
        </p>
      )}
    </div>
  );
}
