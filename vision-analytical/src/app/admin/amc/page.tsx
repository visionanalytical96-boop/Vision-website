import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { buttonVariants } from '@/components/ui/Button';
import { getAdminAmcContracts } from '@/lib/data/admin-amc';
import { amcStatusMeta } from '@/lib/status';
import { formatDate, formatMinorAmount } from '@/lib/format';

export const metadata: Metadata = { title: 'AMC / CMC Contracts' };

export default async function AdminAmcPage() {
  const contracts = await getAdminAmcContracts();

  if (contracts.length === 0) {
    return (
      <EmptyState
        title="No AMC/CMC contracts yet"
        description="Set up annual or comprehensive maintenance contracts for customers."
        actionLabel="New Contract"
        actionHref="/admin/amc/new"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/admin/amc/new" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
          <Plus className="h-4 w-4" />
          New Contract
        </Link>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Contract #</TableHeaderCell>
            <TableHeaderCell>Customer</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Valid until</TableHeaderCell>
            <TableHeaderCell>Visits</TableHeaderCell>
            <TableHeaderCell>Value</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {contracts.map((contract) => (
            <TableRow key={contract.id}>
              <TableCell className="font-mono">{contract.contractNumber}</TableCell>
              <TableCell>{contract.customer.companyName ?? contract.customer.name}</TableCell>
              <TableCell>{contract.type}</TableCell>
              <TableCell>{formatDate(contract.endDate)}</TableCell>
              <TableCell>
                {contract.visitsUsed}/{contract.visitsIncluded}
              </TableCell>
              <TableCell>{contract.priceMinor ? formatMinorAmount(contract.priceMinor) : '—'}</TableCell>
              <TableCell>
                <StatusBadge meta={amcStatusMeta[contract.status]} />
              </TableCell>
              <TableCell>
                <Link href={`/admin/amc/${contract.id}`} className="text-blue-600 hover:underline dark:text-cyan-400">
                  View
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
