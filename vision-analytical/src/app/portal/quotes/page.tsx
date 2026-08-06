import type { Metadata } from 'next';
import Link from 'next/link';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { getSession } from '@/lib/dal';
import { getCustomerQuotes } from '@/lib/data/portal';
import { formatDate, formatMinorAmount } from '@/lib/format';
import { quoteStatusMeta } from '@/lib/status';

export const metadata: Metadata = { title: 'Your Quotes' };

export default async function PortalQuotesPage() {
  const session = await getSession();
  if (!session) return null;

  const quotes = await getCustomerQuotes(session.userId);

  if (quotes.length === 0) {
    return <EmptyState title="No quote requests yet" description="Requests you submit from the spare parts store will appear here." actionLabel="Request a quote" actionHref="/spare-parts" />;
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Quote #</TableHeaderCell>
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
            <TableCell>{formatDate(quote.createdAt)}</TableCell>
            <TableCell>{quote.items.length}</TableCell>
            <TableCell>{quote.totalMinor ? formatMinorAmount(quote.totalMinor) : 'Pending'}</TableCell>
            <TableCell>
              <StatusBadge meta={quoteStatusMeta[quote.status]} />
            </TableCell>
            <TableCell>
              <Link href={`/portal/quotes/${quote.id}`} className="text-blue-600 hover:underline dark:text-cyan-400">
                View
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
