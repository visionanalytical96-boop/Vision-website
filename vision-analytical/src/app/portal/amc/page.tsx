import type { Metadata } from 'next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { getSession } from '@/lib/dal';
import { getCustomerAmcContracts } from '@/lib/data/portal';
import { formatDate, formatMinorAmount } from '@/lib/format';
import { amcStatusMeta } from '@/lib/status';

export const metadata: Metadata = { title: 'AMC Contracts' };

export default async function PortalAmcPage() {
  const session = await getSession();
  if (!session) return null;

  const contracts = await getCustomerAmcContracts(session.userId);

  if (contracts.length === 0) {
    return <EmptyState title="No AMC/CMC contracts" description="Contact us to set up an annual maintenance plan for your instruments." actionLabel="Contact us" actionHref="/contact" />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {contracts.map((contract) => (
        <Card key={contract.id}>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{contract.type}</CardTitle>
            <StatusBadge meta={amcStatusMeta[contract.status]} />
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-mono text-xs text-muted">{contract.contractNumber}</p>
            <p className="text-foreground">{contract.instrumentDescription}</p>
            <div className="flex justify-between text-muted">
              <span>Valid</span>
              <span>
                {formatDate(contract.startDate)} – {formatDate(contract.endDate)}
              </span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Visits used</span>
              <span>
                {contract.visitsUsed} / {contract.visitsIncluded}
              </span>
            </div>
            {contract.priceMinor && (
              <div className="flex justify-between text-muted">
                <span>Contract value</span>
                <span>{formatMinorAmount(contract.priceMinor)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
