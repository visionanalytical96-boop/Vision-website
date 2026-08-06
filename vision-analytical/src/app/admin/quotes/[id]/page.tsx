import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ConvertQuoteForm } from '@/components/forms/ConvertQuoteForm';
import { getAdminQuoteById } from '@/lib/data/admin-quotes';
import { updateQuotePricing, setQuoteStatus } from '@/lib/actions/admin-quotes';
import { formatDate } from '@/lib/format';
import { quoteStatusMeta } from '@/lib/status';
import { QuoteStatus } from '@/generated/prisma/enums';

export const metadata: Metadata = { title: 'Quote Detail' };

export default async function AdminQuoteDetailPage(props: PageProps<'/admin/quotes/[id]'>) {
  const { id } = await props.params;
  const quote = await getAdminQuoteById(id);
  if (!quote) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted">{quote.quoteNumber}</p>
          <p className="mt-1 text-sm text-foreground">
            {quote.contactName} · {quote.contactEmail}
            {quote.customer && <span className="text-muted"> (registered customer)</span>}
          </p>
          <p className="text-xs text-muted">Requested {formatDate(quote.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge meta={quoteStatusMeta[quote.status]} />
          <form action={setQuoteStatus} className="flex items-center gap-2">
            <input type="hidden" name="quoteId" value={quote.id} />
            <Select name="status" defaultValue={quote.status} className="h-9 w-36 text-sm">
              {Object.values(QuoteStatus).map((status) => (
                <option key={status} value={status}>
                  {quoteStatusMeta[status].label}
                </option>
              ))}
            </Select>
            <Button type="submit" size="sm" variant="outline">
              Set
            </Button>
          </form>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items &amp; pricing</CardTitle>
        </CardHeader>
        <form action={updateQuotePricing}>
          <input type="hidden" name="quoteId" value={quote.id} />
          <CardContent className="p-0">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Description</TableHeaderCell>
                  <TableHeaderCell>Qty</TableHeaderCell>
                  <TableHeaderCell>Unit Price (₹)</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {quote.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      <Input
                        name={`price_${item.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={item.unitPriceMinor ? item.unitPriceMinor / 100 : ''}
                        className="h-8 w-28 text-sm"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <div className="flex items-center justify-between border-t border-border p-4">
            <p className="text-sm text-muted">Saving marks this quote as Sent.</p>
            <Button type="submit" size="sm">
              Save Pricing &amp; Send
            </Button>
          </div>
        </form>
      </Card>

      {quote.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Customer notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted">{quote.notes}</CardContent>
        </Card>
      )}

      {quote.status === QuoteStatus.ACCEPTED && (
        <Card>
          <CardHeader>
            <CardTitle>Convert to order</CardTitle>
          </CardHeader>
          <CardContent>
            {quote.customerId ? (
              <ConvertQuoteForm quoteId={quote.id} />
            ) : (
              <p className="text-sm text-muted">
                This quote has no linked customer account, so it can&rsquo;t be converted to a tracked order yet. Ask{' '}
                {quote.contactName} to register with {quote.contactEmail}, then re-link the quote.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {quote.order && (
        <Card>
          <CardHeader>
            <CardTitle>Order</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/admin/orders/${quote.order.id}`} className="font-mono text-blue-600 hover:underline dark:text-cyan-400">
              {quote.order.orderNumber}
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
