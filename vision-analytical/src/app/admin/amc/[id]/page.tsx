import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { getAdminAmcContractById } from '@/lib/data/admin-amc';
import { updateAmcStatus } from '@/lib/actions/admin-amc';
import { formatDate } from '@/lib/format';
import { amcStatusMeta, serviceRequestStatusMeta } from '@/lib/status';
import { AmcStatus } from '@/generated/prisma/enums';

export const metadata: Metadata = { title: 'AMC / CMC Contract Detail' };

export default async function AdminAmcDetailPage(props: PageProps<'/admin/amc/[id]'>) {
  const { id } = await props.params;
  const contract = await getAdminAmcContractById(id);
  if (!contract) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted">{contract.contractNumber}</p>
          <p className="mt-1 text-sm text-foreground">
            {contract.customer.companyName ?? contract.customer.name} · {contract.type}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge meta={amcStatusMeta[contract.status]} />
          <form action={updateAmcStatus} className="flex items-center gap-2">
            <input type="hidden" name="contractId" value={contract.id} />
            <Select name="status" defaultValue={contract.status} className="h-9 w-40 text-sm">
              {Object.values(AmcStatus).map((status) => (
                <option key={status} value={status}>
                  {amcStatusMeta[status].label}
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
            <CardTitle>Contract details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted">Instrument</p>
              <p className="text-foreground">{contract.instrumentDescription}</p>
            </div>
            <div>
              <p className="text-muted">Valid</p>
              <p className="text-foreground">
                {formatDate(contract.startDate)} – {formatDate(contract.endDate)}
              </p>
            </div>
            <div>
              <p className="text-muted">Visits</p>
              <p className="text-foreground">
                {contract.visitsUsed} / {contract.visitsIncluded} used
              </p>
            </div>
            {contract.priceMinor && (
              <div>
                <p className="text-muted">Contract value</p>
                <p className="text-foreground">₹{(contract.priceMinor / 100).toLocaleString('en-IN')}</p>
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
              <p className="text-foreground">{contract.customer.companyName ?? contract.customer.name}</p>
              {contract.customer.companyName && <p className="text-xs text-muted">Attn: {contract.customer.name}</p>}
            </div>
            {contract.customer.phone && (
              <div>
                <p className="text-muted">Phone</p>
                <p className="text-foreground">{contract.customer.phone}</p>
              </div>
            )}
            <div>
              <p className="text-muted">Email</p>
              <p className="text-foreground">{contract.customer.email}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visit history ({contract.serviceRequests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {contract.serviceRequests.length === 0 ? (
            <EmptyState title="No visits logged yet" description="Service requests linked to this contract will appear here." />
          ) : (
            <ul className="space-y-3">
              {contract.serviceRequests.map((request) => (
                <li key={request.id}>
                  <Link
                    href={`/admin/service-requests/${request.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg p-2 hover:bg-surface-muted"
                  >
                    <div>
                      <p className="font-mono text-sm text-foreground">{request.ticketNumber}</p>
                      <p className="text-xs text-muted">
                        {formatDate(request.createdAt)} · {request.assignedEngineer?.name ?? 'Unassigned'}
                      </p>
                    </div>
                    <StatusBadge meta={serviceRequestStatusMeta[request.status]} />
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
