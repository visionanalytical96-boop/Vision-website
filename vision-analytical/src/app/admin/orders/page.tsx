import type { Metadata } from 'next';
import Link from 'next/link';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { getAdminOrders } from '@/lib/data/admin-orders';
import { orderStatusMeta } from '@/lib/status';
import { formatDate, formatMinorAmount } from '@/lib/format';

export const metadata: Metadata = { title: 'Orders' };

export default async function AdminOrdersPage() {
  const orders = await getAdminOrders();

  if (orders.length === 0) {
    return <EmptyState title="No orders yet" description="Orders converted from accepted quotes will appear here." />;
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Order #</TableHeaderCell>
          <TableHeaderCell>Customer</TableHeaderCell>
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
            <TableCell>{order.customer.name}</TableCell>
            <TableCell>{formatDate(order.createdAt)}</TableCell>
            <TableCell>{order.items.length}</TableCell>
            <TableCell>{formatMinorAmount(order.totalMinor)}</TableCell>
            <TableCell>
              <StatusBadge meta={orderStatusMeta[order.status]} />
            </TableCell>
            <TableCell>
              <Link href={`/admin/orders/${order.id}`} className="text-blue-600 hover:underline dark:text-cyan-400">
                View
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
