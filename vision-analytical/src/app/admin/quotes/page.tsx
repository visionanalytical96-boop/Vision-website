import type { Metadata } from 'next';
import Link from 'next/link';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { getAdminQuotes } from '@/lib/data/admin-quotes';
import { quoteStatusMeta } from '@/lib/status';
import { formatDate, formatMinorAmount } from '@/lib/format';

export const metadata: Metadata = { title: 'Quotes' };

export default async function AdminQuotesPage() {
  const quotes = await getAdminQuotes();

  if (quotes.length === 0) {
    return <EmptyState title="No quote requests yet" />;
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Quote #</TableHeaderCell>
          <TableHeaderCell>Contact</TableHeaderCell>
          <TableHeaderCell>Date</TableHeaderCell>
          <TableHeaderCell>Items</TableHeaderCell>
          <TableHeaderCell>Total</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell />
        </TableRow>
      </TableHead>
      <TableBody>
        {quotes.map((quote) => (
          <TableRow key={quote.id}>
            <TableCell className="font-mono">{quote.quoteNumber}</TableCell>
            <TableCell>{quote.customer?.name ?? quote.contactName}</TableCell>
            <TableCell>{formatDate(quote.createdAt)}</TableCell>
            <TableCell>{quote.items.length}</TableCell>
            <TableCell>{quote.totalMinor ? formatMinorAmount(quote.totalMinor) : 'Not priced'}</TableCell>
            <TableCell>
              <StatusBadge meta={quoteStatusMeta[quote.status]} />
            </TableCell>
            <TableCell>
              <Link href={`/admin/quotes/${quote.id}`} className="text-primary hover:underline dark:text-secondary">
                View
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
