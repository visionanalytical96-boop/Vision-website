import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { getSession } from '@/lib/dal';
import { getCustomerServiceRequestById } from '@/lib/data/portal';
import { formatDateTime } from '@/lib/format';
import { serviceRequestStatusMeta, priorityMeta } from '@/lib/status';
import { SERVICE_REQUEST_TYPE_LABELS } from '@/lib/service-request-labels';

export const metadata: Metadata = { title: 'Service Request Detail' };

export default async function PortalServiceRequestDetailPage(props: PageProps<'/portal/service-requests/[id]'>) {
  const { id } = await props.params;
  const session = await getSession();
  if (!session) return null;

  const request = await getCustomerServiceRequestById(session.userId, id);
  if (!request) notFound();

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-sm text-muted">{request.ticketNumber}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <StatusBadge meta={serviceRequestStatusMeta[request.status]} />
          <StatusBadge meta={priorityMeta[request.priority]} />
          <span className="text-sm text-muted">{SERVICE_REQUEST_TYPE_LABELS[request.type]}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
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
          <div>
            <p className="text-muted">Assigned engineer</p>
            <p className="text-foreground">{request.assignedEngineer?.name ?? 'Not yet assigned'}</p>
          </div>
          <div>
            <p className="text-muted">Raised</p>
            <p className="text-foreground">{formatDateTime(request.createdAt)}</p>
          </div>
        </CardContent>
      </Card>

      {request.reports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Engineer reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {request.reports.map((report) => (
              <div key={report.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <p className="text-xs text-muted">{formatDateTime(report.reportedAt)}</p>
                <p className="mt-1 text-sm text-foreground">{report.workPerformed}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
