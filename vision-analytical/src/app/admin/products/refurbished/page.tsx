import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { buttonVariants } from '@/components/ui/Button';
import { ConfirmSubmitButton } from '@/components/forms/ConfirmSubmitButton';
import { getAdminRefurbishedInstruments } from '@/lib/data/admin-products';
import { refurbishedConditionMeta } from '@/lib/status';
import { formatMinorAmount } from '@/lib/format';
import { deleteRefurbished } from '@/lib/actions/admin-refurbished';

export const metadata: Metadata = { title: 'Refurbished Instruments' };

export default async function AdminRefurbishedPage() {
  const instruments = await getAdminRefurbishedInstruments();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/admin/products/refurbished/new" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
          <Plus className="h-4 w-4" />
          Add Refurbished Instrument
        </Link>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Category</TableHeaderCell>
            <TableHeaderCell>Condition</TableHeaderCell>
            <TableHeaderCell>Warranty</TableHeaderCell>
            <TableHeaderCell>Price</TableHeaderCell>
            <TableHeaderCell>Published</TableHeaderCell>
            <TableHeaderCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {instruments.map((instrument) => (
            <TableRow key={instrument.id}>
              <TableCell>{instrument.name}</TableCell>
              <TableCell>{instrument.category.name}</TableCell>
              <TableCell>
                <StatusBadge meta={refurbishedConditionMeta[instrument.condition]} />
              </TableCell>
              <TableCell>{instrument.warrantyMonths} mo</TableCell>
              <TableCell>{instrument.priceMinor ? formatMinorAmount(instrument.priceMinor) : '—'}</TableCell>
              <TableCell>{instrument.isPublished ? <span className="text-success">Published</span> : <span className="text-muted">Draft</span>}</TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Link href={`/admin/products/refurbished/${instrument.id}`} className="text-blue-600 hover:underline dark:text-cyan-400" aria-label={`Edit ${instrument.name}`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <form action={deleteRefurbished}>
                    <input type="hidden" name="id" value={instrument.id} />
                    <ConfirmSubmitButton confirmMessage={`Delete "${instrument.name}"? This cannot be undone.`} className="text-xs text-danger hover:underline">
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
