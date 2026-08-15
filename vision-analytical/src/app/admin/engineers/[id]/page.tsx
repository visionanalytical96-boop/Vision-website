import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmSubmitButton } from '@/components/forms/ConfirmSubmitButton';
import { getAdminEngineerById } from '@/lib/data/admin-engineers';
import { toggleEngineerActive } from '@/lib/actions/admin-engineers';
import { formatDate } from '@/lib/format';
import { serviceRequestStatusMeta, priorityMeta } from '@/lib/status';
import { SERVICE_REQUEST_TYPE_LABELS } from '@/lib/service-request-labels';

export const metadata: Metadata = { title: 'Engineer Detail' };

export default async function AdminEngineerDetailPage(props: PageProps<'/admin/engineers/[id]'>) {
  const { id } = await props.params;
  const engineer = await getAdminEngineerById(id);
  if (!engineer) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">{engineer.name}</h2>
          <p className="text-sm text-muted">{engineer.email}</p>
          {engineer.phone && <p className="text-sm text-muted">{engineer.phone}</p>}
          <p className="mt-1 text-xs text-muted">Joined {formatDate(engineer.createdAt)}</p>
        </div>
        <form action={toggleEngineerActive}>
          <input type="hidden" name="id" value={engineer.id} />
          <ConfirmSubmitButton
            confirmMessage={
              engineer.isActive
                ? `Deactivate ${engineer.name}? They will not be able to log in.`
                : `Reactivate ${engineer.name}?`
            }
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-muted"
          >
            {engineer.isActive ? 'Deactivate account' : 'Reactivate account'}
          </ConfirmSubmitButton>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned service requests ({engineer.assignedServiceJobs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {engineer.assignedServiceJobs.length === 0 ? (
            <EmptyState title="No service requests assigned yet" />
          ) : (
            <ul className="space-y-3">
              {engineer.assignedServiceJobs.map((job) => (
                <li key={job.id}>
                  <Link
                    href={`/admin/service-requests/${job.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg p-2 hover:bg-surface-muted"
                  >
                    <div>
                      <p className="font-mono text-sm text-foreground">{job.ticketNumber}</p>
                      <p className="text-xs text-muted">
                        {SERVICE_REQUEST_TYPE_LABELS[job.type]} · {job.instrumentDescription}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge meta={priorityMeta[job.priority]} />
                      <StatusBadge meta={serviceRequestStatusMeta[job.status]} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
