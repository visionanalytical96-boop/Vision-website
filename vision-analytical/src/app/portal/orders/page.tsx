import type { Metadata } from 'next';
import Link from 'next/link';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { getSession } from '@/lib/dal';
import { getCustomerOrders } from '@/lib/data/portal';
import { formatDate, formatMinorAmount } from '@/lib/format';
import { orderStatusMeta } from '@/lib/status';

export const metadata: Metadata = { title: 'Your Orders' };

export default async function PortalOrdersPage() {
  const session = await getSession();
  if (!session) return null;

  const orders = await getCustomerOrders(session.userId);

  if (orders.length === 0) {
    return <EmptyState title="No orders yet" description="Your order history will appear here." actionLabel="Browse spare parts" actionHref="/spare-parts" />;
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Order #</TableHeaderCell>
          <TableHeaderCell>Date</TableHeaderCell>
          <TableHeaderCell>Items</TableHeaderCell>
          <TableHeaderCell>Total</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell />
        </TableRow>
      </TableHead>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-mono">{order.orderNumber}</TableCell>
            <TableCell>{formatDate(order.createdAt)}</TableCell>
            <TableCell>{order.items.length}</TableCell>
            <TableCell>{formatMinorAmount(order.totalMinor)}</TableCell>
            <TableCell>
              <StatusBadge meta={orderStatusMeta[order.status]} />
            </TableCell>
            <TableCell>
              <Link href={`/portal/orders/${order.id}`} className="text-primary hover:underline dark:text-secondary">
                View
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
