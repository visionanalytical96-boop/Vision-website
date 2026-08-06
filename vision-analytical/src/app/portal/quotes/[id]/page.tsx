import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { getSession } from '@/lib/dal';
import { getCustomerQuoteById } from '@/lib/data/portal';
import { formatDate, formatMinorAmount } from '@/lib/format';
import { quoteStatusMeta } from '@/lib/status';

export const metadata: Metadata = { title: 'Quote Detail' };

export default async function PortalQuoteDetailPage(props: PageProps<'/portal/quotes/[id]'>) {
  const { id } = await props.params;
  const session = await getSession();
  if (!session) return null;

  const quote = await getCustomerQuoteById(session.userId, id);
  if (!quote) notFound();

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-sm text-muted">{quote.quoteNumber}</p>
        <div className="mt-1 flex items-center gap-3">
          <StatusBadge meta={quoteStatusMeta[quote.status]} />
          <span className="text-sm text-muted">Requested {formatDate(quote.createdAt)}</span>
          {quote.validUntil && <span className="text-sm text-muted">· Valid until {formatDate(quote.validUntil)}</span>}
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
                <TableHeaderCell>Description</TableHeaderCell>
                <TableHeaderCell>Qty</TableHeaderCell>
                <TableHeaderCell>Unit Price</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {quote.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.unitPriceMinor ? formatMinorAmount(item.unitPriceMinor) : 'Pending'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        {quote.totalMinor && (
          <div className="flex justify-end border-t border-border p-4">
            <p className="font-medium text-foreground">Total: {formatMinorAmount(quote.totalMinor)}</p>
          </div>
        )}
      </Card>

      {quote.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted">{quote.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}
