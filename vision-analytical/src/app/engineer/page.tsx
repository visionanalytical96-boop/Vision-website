import type { Metadata } from 'next';
import Link from 'next/link';
import { ClipboardList, AlertTriangle, CheckCircle2, MapPin, Phone } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { requireSession } from '@/lib/dal';
import { getEngineerVisits, getEngineerVisitSummary } from '@/lib/data/engineer-visits';
import { formatDate } from '@/lib/format';
import { priorityMeta } from '@/lib/status';
import { visitStatusMeta } from '@/lib/service-visit';
import { SERVICE_REQUEST_TYPE_LABELS } from '@/lib/service-request-labels';

export const metadata: Metadata = { title: 'My Jobs' };

export default async function EngineerJobsPage() {
  const session = await requireSession();
  const [summary, visits] = await Promise.all([
    getEngineerVisitSummary(session.userId),
    getEngineerVisits(session.userId),
  ]);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open jobs" value={summary.active} icon={<ClipboardList className="h-5 w-5" />} />
        <StatCard label="High / urgent priority" value={summary.urgent} icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard label="Closed this month" value={summary.closedThisMonth} icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>

      {visits.length === 0 ? (
        <EmptyState title="No open jobs" description="Jobs assigned to you will show up here." />
      ) : (
        <ul className="space-y-3">
          {visits.map((visit) => {
            const request = visit.serviceRequest;
            const site = visit.customerInstrument;

            return (
              <li key={visit.id}>
                <Link
                  href={`/engineer/jobs/${visit.id}`}
                  className="block rounded-xl border border-border bg-surface p-4 shadow-sm hover:bg-surface-muted"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-muted">{visit.visitNumber}</p>
                      <p className="mt-0.5 font-medium text-foreground">
                        {site?.nickname ?? request.instrumentDescription}
                      </p>
                      <p className="text-xs text-muted">
                        {request.customer.companyName ?? request.customer.name} ·{' '}
                        {SERVICE_REQUEST_TYPE_LABELS[request.type]}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge meta={priorityMeta[request.priority]} />
                      <Badge tone={visitStatusMeta[visit.status].tone}>{visitStatusMeta[visit.status].label}</Badge>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    {(site?.siteName ?? site?.city) && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[site?.siteName, site?.city].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {request.customer.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {request.customer.phone}
                      </span>
                    )}
                    <span>{visit.scheduledFor ? `Scheduled ${formatDate(visit.scheduledFor)}` : `Raised ${formatDate(visit.createdAt)}`}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
