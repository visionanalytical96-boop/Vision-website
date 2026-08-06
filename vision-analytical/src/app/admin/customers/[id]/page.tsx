import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmSubmitButton } from '@/components/forms/ConfirmSubmitButton';
import { getAdminCustomerById } from '@/lib/data/admin-customers';
import { getCustomerOrders, getCustomerQuotes, getCustomerServiceRequests, getCustomerAmcContracts } from '@/lib/data/portal';
import { toggleCustomerActive } from '@/lib/actions/admin-customers';
import { formatDate, formatMinorAmount } from '@/lib/format';
import { orderStatusMeta, quoteStatusMeta, serviceRequestStatusMeta, amcStatusMeta } from '@/lib/status';

export const metadata: Metadata = { title: 'Customer Detail' };

export default async function AdminCustomerDetailPage(props: PageProps<'/admin/customers/[id]'>) {
  const { id } = await props.params;
  const customer = await getAdminCustomerById(id);
  if (!customer) notFound();

  const [orders, quotes, serviceRequests, amcContracts] = await Promise.all([
    getCustomerOrders(id),
    getCustomerQuotes(id),
    getCustomerServiceRequests(id),
    getCustomerAmcContracts(id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">{customer.name}</h2>
          <p className="text-sm text-muted">{customer.email}</p>
          {customer.companyName && <p className="text-sm text-muted">{customer.companyName}</p>}
          {customer.phone && <p className="text-sm text-muted">{customer.phone}</p>}
          <p className="mt-1 text-xs text-muted">Joined {formatDate(customer.createdAt)}</p>
        </div>
        <form action={toggleCustomerActive}>
          <input type="hidden" name="id" value={customer.id} />
          <ConfirmSubmitButton
            confirmMessage={customer.isActive ? `Deactivate ${customer.name}? They will not be able to log in.` : `Reactivate ${customer.name}?`}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-muted"
          >
            {customer.isActive ? 'Deactivate account' : 'Reactivate account'}
          </ConfirmSubmitButton>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Orders ({orders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-sm text-muted">No orders yet.</p>
            ) : (
              <ul className="space-y-2">
                {orders.map((order) => (
                  <li key={order.id} className="flex items-center justify-between text-sm">
                    <span className="font-mono">{order.orderNumber}</span>
                    <div className="flex items-center gap-2">
                      <span>{formatMinorAmount(order.totalMinor)}</span>
                      <StatusBadge meta={orderStatusMeta[order.status]} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quotes ({quotes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {quotes.length === 0 ? (
              <p className="text-sm text-muted">No quote requests yet.</p>
            ) : (
              <ul className="space-y-2">
                {quotes.map((quote) => (
                  <li key={quote.id} className="flex items-center justify-between text-sm">
                    <span className="font-mono">{quote.quoteNumber}</span>
                    <StatusBadge meta={quoteStatusMeta[quote.status]} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service requests ({serviceRequests.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {serviceRequests.length === 0 ? (
              <p className="text-sm text-muted">No service requests yet.</p>
            ) : (
              <ul className="space-y-2">
                {serviceRequests.map((request) => (
                  <li key={request.id} className="flex items-center justify-between text-sm">
                    <span className="font-mono">{request.ticketNumber}</span>
                    <StatusBadge meta={serviceRequestStatusMeta[request.status]} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AMC contracts ({amcContracts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {amcContracts.length === 0 ? (
              <p className="text-sm text-muted">No AMC/CMC contracts.</p>
            ) : (
              <ul className="space-y-2">
                {amcContracts.map((contract) => (
                  <li key={contract.id} className="flex items-center justify-between text-sm">
                    <span className="font-mono">{contract.contractNumber}</span>
                    <StatusBadge meta={amcStatusMeta[contract.status]} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
