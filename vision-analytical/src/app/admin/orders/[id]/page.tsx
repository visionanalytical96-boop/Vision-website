import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { getAdminOrderById } from '@/lib/data/admin-orders';
import { updateOrderStatus, createInvoiceForOrder } from '@/lib/actions/admin-orders';
import { formatDate, formatMinorAmount } from '@/lib/format';
import { orderStatusMeta, invoiceStatusMeta } from '@/lib/status';
import { OrderStatus, InvoiceStatus } from '@/generated/prisma/enums';

export const metadata: Metadata = { title: 'Order Detail' };

interface AddressLike {
  line1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

function isAddressLike(value: unknown): value is AddressLike {
  return typeof value === 'object' && value !== null;
}

export default async function AdminOrderDetailPage(props: PageProps<'/admin/orders/[id]'>) {
  const { id } = await props.params;
  const order = await getAdminOrderById(id);
  if (!order) notFound();

  const address = isAddressLike(order.shippingAddress) ? order.shippingAddress : {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted">{order.orderNumber}</p>
          <p className="mt-1 text-sm text-foreground">
            {order.customer.name} · {order.customer.email}
          </p>
          <p className="text-xs text-muted">Placed {formatDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge meta={orderStatusMeta[order.status]} />
          <form action={updateOrderStatus} className="flex items-center gap-2">
            <input type="hidden" name="orderId" value={order.id} />
            <Select name="status" defaultValue={order.status} className="h-9 w-40 text-sm">
              {Object.values(OrderStatus).map((status) => (
                <option key={status} value={status}>
                  {orderStatusMeta[status].label}
                </option>
              ))}
            </Select>
            <Button type="submit" size="sm" variant="outline">
              Update
            </Button>
          </form>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Item</TableHeaderCell>
                <TableHeaderCell>SKU</TableHeaderCell>
                <TableHeaderCell>Qty</TableHeaderCell>
                <TableHeaderCell>Unit Price</TableHeaderCell>
                <TableHeaderCell>Total</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.nameSnapshot}</TableCell>
                  <TableCell className="font-mono text-xs">{item.skuSnapshot ?? '—'}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatMinorAmount(item.unitPriceMinor)}</TableCell>
                  <TableCell>{formatMinorAmount(item.lineTotalMinor)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <div className="flex justify-end border-t border-border p-4">
          <p className="font-medium text-foreground">Total: {formatMinorAmount(order.totalMinor)}</p>
        </div>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Shipping address</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted">
            {address.line1 && <p>{address.line1}</p>}
            <p>{[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}</p>
            {address.country && <p>{address.country}</p>}
            {order.poNumber && <p className="mt-2 text-foreground">PO #: {order.poNumber}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.invoices.length > 0 && (
              <ul className="space-y-2">
                {order.invoices.map((invoice) => (
                  <li key={invoice.id} className="flex items-center justify-between text-sm">
                    <span className="font-mono">{invoice.invoiceNumber}</span>
                    <div className="flex items-center gap-2">
                      <span>{formatMinorAmount(invoice.amountMinor)}</span>
                      <StatusBadge meta={invoiceStatusMeta[invoice.status]} />
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <form action={createInvoiceForOrder} className="flex items-center gap-2">
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="dueInDays" value="15" />
              <Select name="status" defaultValue={InvoiceStatus.UNPAID} className="h-9 text-sm">
                <option value={InvoiceStatus.UNPAID}>Unpaid</option>
                <option value={InvoiceStatus.PAID}>Paid</option>
              </Select>
              <Button type="submit" size="sm" variant="outline">
                Issue New Invoice
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
