import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MapPin, Phone, Mail, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { VisitStatusControl } from '@/components/engineer/VisitStatusControl';
import { TravelDistanceForm } from '@/components/engineer/TravelDistanceForm';
import { ServiceReportForm } from '@/components/forms/ServiceReportForm';
import { requireSession } from '@/lib/dal';
import { getEngineerVisitById } from '@/lib/data/engineer-visits';
import { formatDate, formatDateTime } from '@/lib/format';
import { priorityMeta } from '@/lib/status';
import { visitStatusMeta, nextStatuses, isLocationTrustworthy, minutesBetween } from '@/lib/service-visit';
import { SERVICE_REQUEST_TYPE_LABELS } from '@/lib/service-request-labels';

export const metadata: Metadata = { title: 'Job Detail' };

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
}

export default async function EngineerJobDetailPage(props: PageProps<'/engineer/jobs/[id]'>) {
  const { id } = await props.params;
  const session = await requireSession();
  const visit = await getEngineerVisitById(session.userId, id);
  if (!visit) notFound();

  const request = visit.serviceRequest;
  const instrument = visit.customerInstrument;
  const onSiteMinutes = minutesBetween(visit.checkInAt, visit.checkOutAt ?? new Date());
  const address = [instrument?.addressLine, instrument?.city, instrument?.state, instrument?.postalCode]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted">
            {visit.visitNumber} · ticket {request.ticketNumber}
          </p>
          <p className="mt-1 text-sm text-foreground">{SERVICE_REQUEST_TYPE_LABELS[request.type]}</p>
          {visit.scheduledFor && <p className="text-xs text-muted">Scheduled {formatDateTime(visit.scheduledFor)}</p>}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge meta={priorityMeta[request.priority]} />
          <Badge tone={visitStatusMeta[visit.status].tone}>{visitStatusMeta[visit.status].label}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Update this job</CardTitle>
        </CardHeader>
        <CardContent>
          <VisitStatusControl visitId={visit.id} options={nextStatuses(visit.status)} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Instrument &amp; issue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted">Instrument</p>
              <p className="text-foreground">
                {instrument?.nickname ?? request.instrumentDescription}
                {instrument?.instrumentModel && (
                  <span className="text-muted">
                    {' '}
                    — {instrument.instrumentModel.brand?.name} {instrument.instrumentModel.name}
                  </span>
                )}
              </p>
              {instrument?.serialNumber && (
                <p className="font-mono text-xs text-muted">Serial {instrument.serialNumber}</p>
              )}
            </div>
            <div>
              <p className="text-muted">Reported problem</p>
              <p className="text-foreground">{request.description}</p>
            </div>
            {instrument?.calibrationDueOn && (
              <div>
                <p className="text-muted">Calibration due</p>
                <p className="text-foreground">{formatDate(instrument.calibrationDueOn)}</p>
              </div>
            )}
            {instrument?.warrantyEndsOn && (
              <div>
                <p className="text-muted">Warranty</p>
                <p className="text-foreground">
                  {instrument.warrantyEndsOn > new Date()
                    ? `In warranty until ${formatDate(instrument.warrantyEndsOn)}`
                    : `Expired ${formatDate(instrument.warrantyEndsOn)}`}
                </p>
              </div>
            )}
            {request.amcContract && (
              <div>
                <p className="text-muted">Contract</p>
                <p className="text-foreground">
                  {request.amcContract.contractNumber} ({request.amcContract.type}) ·{' '}
                  {request.amcContract.visitsUsed}/{request.amcContract.visitsIncluded} visits used
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Site &amp; contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted">Customer</p>
              <p className="text-foreground">{request.customer.companyName ?? request.customer.name}</p>
              {request.customer.companyName && <p className="text-xs text-muted">Attn: {request.customer.name}</p>}
            </div>
            {address && (
              <div>
                <p className="text-muted">Site</p>
                <p className="text-foreground">
                  {instrument?.siteName && <span className="block">{instrument.siteName}</span>}
                  {address}
                </p>
                <a
                  href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline dark:text-secondary"
                >
                  <Navigation className="h-3 w-3" /> Open in maps
                </a>
              </div>
            )}
            {request.customer.phone && (
              <div>
                <p className="text-muted">Phone</p>
                <a href={`tel:${request.customer.phone}`} className="inline-flex items-center gap-1 text-foreground hover:underline">
                  <Phone className="h-3.5 w-3.5" /> {request.customer.phone}
                </a>
              </div>
            )}
            <div>
              <p className="text-muted">Email</p>
              <a href={`mailto:${request.customer.email}`} className="inline-flex items-center gap-1 text-foreground hover:underline">
                <Mail className="h-3.5 w-3.5" /> {request.customer.email}
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Time on site</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              ['Accepted', visit.acceptedAt],
              ['Travel started', visit.travelStartedAt],
              ['Checked in', visit.checkInAt],
              ['Work started', visit.workStartedAt],
              ['Work completed', visit.workCompletedAt],
              ['Closed', visit.closedAt],
            ].map(([label, at]) => (
              <div key={label as string}>
                <dt className="text-muted">{label as string}</dt>
                <dd className="text-foreground">{at ? formatDateTime(at as Date) : '—'}</dd>
              </div>
            ))}
          </dl>

          {visit.checkInAt && onSiteMinutes !== null && (
            <p className="text-muted">
              On site {formatMinutes(onSiteMinutes)}
              {!visit.checkOutAt && ' so far'}
            </p>
          )}

          {visit.checkInLatitude !== null && visit.checkInLongitude !== null && (
            <p className="inline-flex items-center gap-1 text-xs text-muted">
              <MapPin className={`h-3 w-3 ${isLocationTrustworthy(visit.checkInAccuracyM) ? 'text-success' : 'text-warning'}`} />
              Checked in at {visit.checkInLatitude.toFixed(5)}, {visit.checkInLongitude.toFixed(5)}
              {visit.checkInAccuracyM !== null && ` (±${Math.round(visit.checkInAccuracyM)}m)`}
              {!isLocationTrustworthy(visit.checkInAccuracyM) && ' — too vague to confirm the site'}
            </p>
          )}

          <TravelDistanceForm visitId={visit.id} current={visit.travelDistanceKm} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ServiceReportForm jobId={request.id} />

          {visit.reports.length === 0 ? (
            <p className="text-sm text-muted">No report submitted yet.</p>
          ) : (
            <ul className="space-y-4 border-t border-border pt-4">
              {visit.reports.map((report) => (
                <li key={report.id} className="text-sm">
                  <p className="text-xs text-muted">{formatDateTime(report.reportedAt)}</p>
                  <p className="mt-1 text-foreground">{report.workPerformed}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {visit.events.map((event) => (
              <li key={event.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-border" aria-hidden />
                <div className="min-w-0">
                  <p className="text-foreground">
                    {visitStatusMeta[event.status].label}
                    <span className="text-muted"> · {event.actorLabel}</span>
                  </p>
                  <p className="text-xs text-muted">{formatDateTime(event.createdAt)}</p>
                  {event.note && <p className="mt-1 text-foreground">{event.note}</p>}
                  {event.latitude !== null && event.longitude !== null && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
                      <MapPin className="h-3 w-3" />
                      {event.latitude.toFixed(5)}, {event.longitude.toFixed(5)}
                      {event.accuracyM !== null && ` (±${Math.round(event.accuracyM)}m)`}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
