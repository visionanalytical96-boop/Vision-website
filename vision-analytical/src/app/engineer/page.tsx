import type { Metadata } from 'next';
import Link from 'next/link';
import { ClipboardList, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { requireSession } from '@/lib/dal';
import { getEngineerActiveJobs, getEngineerDashboardSummary } from '@/lib/data/engineer';
import { formatDate } from '@/lib/format';
import { serviceRequestStatusMeta, priorityMeta } from '@/lib/status';
import { SERVICE_REQUEST_TYPE_LABELS } from '@/lib/service-request-labels';

export const metadata: Metadata = { title: 'Assigned Jobs' };

export default async function EngineerJobsPage() {
  const session = await requireSession();
  const [summary, jobs] = await Promise.all([
    getEngineerDashboardSummary(session.userId),
    getEngineerActiveJobs(session.userId),
  ]);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active jobs" value={summary.activeCount} icon={<ClipboardList className="h-5 w-5" />} />
        <StatCard label="High / urgent priority" value={summary.urgentCount} icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard label="Completed this month" value={summary.completedThisMonth} icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>

      {jobs.length === 0 ? (
        <EmptyState title="No active jobs" description="Service requests assigned to you will show up here." />
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/engineer/jobs/${job.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm hover:bg-surface-muted"
              >
                <div>
                  <p className="font-mono text-sm text-muted">{job.ticketNumber}</p>
                  <p className="text-sm font-medium text-foreground">{job.instrumentDescription}</p>
                  <p className="text-xs text-muted">
                    {job.customer.companyName ?? job.customer.name} · {SERVICE_REQUEST_TYPE_LABELS[job.type]} · Raised {formatDate(job.createdAt)}
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
    </div>
  );
}
