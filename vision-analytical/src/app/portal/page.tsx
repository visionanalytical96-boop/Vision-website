import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, ShoppingCart, Headset, ShieldCheck } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { getSession } from '@/lib/dal';
import { getPortalSummary, getCustomerOrders, getCustomerQuotes } from '@/lib/data/portal';
import { formatDate, formatMinorAmount } from '@/lib/format';
import { orderStatusMeta, quoteStatusMeta } from '@/lib/status';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function PortalDashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const [summary, orders, quotes] = await Promise.all([
    getPortalSummary(session.userId),
    getCustomerOrders(session.userId),
    getCustomerQuotes(session.userId),
  ]);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending quotes" value={summary.pendingQuotesCount} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Active orders" value={summary.activeOrdersCount} icon={<ShoppingCart className="h-5 w-5" />} />
        <StatCard label="Open service requests" value={summary.openServiceRequestsCount} icon={<Headset className="h-5 w-5" />} />
        <StatCard
          label="Next AMC expiry"
          value={summary.nextAmcExpiry ? formatDate(summary.nextAmcExpiry) : '—'}
          icon={<ShieldCheck className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent orders</CardTitle>
            <Link href="/portal/orders" className="text-sm text-primary hover:underline dark:text-secondary">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <EmptyState title="No orders yet" actionLabel="Browse spare parts" actionHref="/spare-parts" />
            ) : (
              <ul className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <li key={order.id}>
                    <Link href={`/portal/orders/${order.id}`} className="flex items-center justify-between gap-3 rounded-lg p-2 hover:bg-surface-muted">
                      <div>
                        <p className="font-mono text-sm text-foreground">{order.orderNumber}</p>
                        <p className="text-xs text-muted">{formatDate(order.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-foreground">{formatMinorAmount(order.totalMinor)}</span>
                        <StatusBadge meta={orderStatusMeta[order.status]} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent quotes</CardTitle>
            <Link href="/portal/quotes" className="text-sm text-primary hover:underline dark:text-secondary">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {quotes.length === 0 ? (
              <EmptyState title="No quote requests yet" actionLabel="Request a quote" actionHref="/spare-parts" />
            ) : (
              <ul className="space-y-3">
                {quotes.slice(0, 5).map((quote) => (
                  <li key={quote.id}>
                    <Link href={`/portal/quotes/${quote.id}`} className="flex items-center justify-between gap-3 rounded-lg p-2 hover:bg-surface-muted">
                      <div>
                        <p className="font-mono text-sm text-foreground">{quote.quoteNumber}</p>
                        <p className="text-xs text-muted">{formatDate(quote.createdAt)}</p>
                      </div>
                      <StatusBadge meta={quoteStatusMeta[quote.status]} />
                    </Link>
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
