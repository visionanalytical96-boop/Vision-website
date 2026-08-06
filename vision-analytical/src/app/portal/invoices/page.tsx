import type { Metadata } from 'next';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { getSession } from '@/lib/dal';
import { getCustomerInvoices } from '@/lib/data/portal';
import { formatDate, formatMinorAmount } from '@/lib/format';
import { invoiceStatusMeta } from '@/lib/status';

export const metadata: Metadata = { title: 'Invoices' };

export default async function PortalInvoicesPage() {
  const session = await getSession();
  if (!session) return null;

  const invoices = await getCustomerInvoices(session.userId);

  if (invoices.length === 0) {
    return <EmptyState title="No invoices yet" description="Invoices from your orders and AMC contracts will appear here." />;
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Invoice #</TableHeaderCell>
          <TableHeaderCell>Issued</TableHeaderCell>
          <TableHeaderCell>Amount</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell />
        </TableRow>
      </TableHead>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="font-mono">{invoice.invoiceNumber}</TableCell>
            <TableCell>{formatDate(invoice.issuedAt)}</TableCell>
            <TableCell>{formatMinorAmount(invoice.amountMinor)}</TableCell>
            <TableCell>
              <StatusBadge meta={invoiceStatusMeta[invoice.status]} />
            </TableCell>
            <TableCell>
              {invoice.pdfUrl ? (
                <a href={invoice.pdfUrl} className="text-blue-600 hover:underline dark:text-cyan-400">
                  Download
                </a>
              ) : (
                <span className="text-xs text-muted">PDF not yet available</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
