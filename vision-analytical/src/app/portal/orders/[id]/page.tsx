import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { RepeatOrderButton } from '@/components/forms/RepeatOrderButton';
import { getSession } from '@/lib/dal';
import { getCustomerOrderById } from '@/lib/data/portal';
import { formatDate, formatMinorAmount } from '@/lib/format';
import { orderStatusMeta, invoiceStatusMeta } from '@/lib/status';

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

export default async function PortalOrderDetailPage(props: PageProps<'/portal/orders/[id]'>) {
  const { id } = await props.params;
  const session = await getSession();
  if (!session) return null;

  const order = await getCustomerOrderById(session.userId, id);
  if (!order) notFound();

  const address = isAddressLike(order.shippingAddress) ? order.shippingAddress : {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted">{order.orderNumber}</p>
          <div className="mt-1 flex items-center gap-3">
            <StatusBadge meta={orderStatusMeta[order.status]} />
            <span className="text-sm text-muted">Placed {formatDate(order.createdAt)}</span>
          </div>
        </div>
        <RepeatOrderButton
          items={order.items.map((item) => ({
            productId: item.productId,
            refurbishedInstrumentId: item.refurbishedInstrumentId,
            nameSnapshot: item.nameSnapshot,
            skuSnapshot: item.skuSnapshot,
            quantity: item.quantity,
          }))}
        />
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
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Shipping address</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted">
            {address.line1 && <p>{address.line1}</p>}
            <p>
              {[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}
            </p>
            {address.country && <p>{address.country}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {order.invoices.length === 0 ? (
              <p className="text-sm text-muted">No invoice issued yet.</p>
            ) : (
              <ul className="space-y-2">
                {order.invoices.map((invoice) => (
                  <li key={invoice.id} className="flex items-center justify-between text-sm">
                    <span className="font-mono">{invoice.invoiceNumber}</span>
                    <div className="flex items-center gap-3">
                      <span>{formatMinorAmount(invoice.amountMinor)}</span>
                      <StatusBadge meta={invoiceStatusMeta[invoice.status]} />
                      {invoice.pdfUrl ? (
                        <a href={invoice.pdfUrl} className="text-blue-600 hover:underline dark:text-cyan-400">
                          Download
                        </a>
                      ) : (
                        <span className="text-xs text-muted">PDF not yet available</span>
                      )}
                    </div>
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
