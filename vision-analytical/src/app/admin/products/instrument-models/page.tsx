import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { buttonVariants } from '@/components/ui/Button';
import { ConfirmSubmitButton } from '@/components/forms/ConfirmSubmitButton';
import { getAllInstrumentModels } from '@/lib/data/instrument-models';
import { deleteInstrumentModel, toggleInstrumentModelPublished } from '@/lib/actions/admin-instrument-models';

export const metadata: Metadata = { title: 'Instrument Models' };

export default async function AdminInstrumentModelsPage() {
  const models = await getAllInstrumentModels();

  if (models.length === 0) {
    return (
      <EmptyState
        title="No instrument models yet"
        description="Models are what customers pick in the parts finder, and what spare parts are mapped against."
        actionLabel="Add Model"
        actionHref="/admin/products/instrument-models/new"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          The instruments customers own. Spare parts map to these, and the parts finder searches them.
        </p>
        <Link
          href="/admin/products/instrument-models/new"
          className={buttonVariants({ variant: 'primary', size: 'sm' })}
        >
          <Plus className="h-4 w-4" />
          Add Model
        </Link>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Model</TableHeaderCell>
            <TableHeaderCell>Brand</TableHeaderCell>
            <TableHeaderCell>Technique</TableHeaderCell>
            <TableHeaderCell>Parts mapped</TableHeaderCell>
            <TableHeaderCell>Published</TableHeaderCell>
            <TableHeaderCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {models.map((model) => (
            <TableRow key={model.id}>
              <TableCell>{model.name}</TableCell>
              <TableCell>{model.brand.name}</TableCell>
              <TableCell>{model.category?.name ?? '—'}</TableCell>
              <TableCell className="tabular-nums">{model._count.compatibility}</TableCell>
              <TableCell>
                <form action={toggleInstrumentModelPublished}>
                  <input type="hidden" name="id" value={model.id} />
                  <button type="submit" className="text-xs">
                    {model.isPublished ? (
                      <span className="text-success">Published</span>
                    ) : (
                      <span className="text-muted">Hidden</span>
                    )}
                  </button>
                </form>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/products/instrument-models/${model.id}`}
                    className="text-primary hover:underline dark:text-secondary"
                    aria-label={`Edit ${model.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <form action={deleteInstrumentModel}>
                    <input type="hidden" name="id" value={model.id} />
                    <ConfirmSubmitButton
                      confirmMessage={
                        model._count.compatibility > 0
                          ? `Delete "${model.name}"? ${model._count.compatibility} part mapping(s) will be removed too.`
                          : `Delete "${model.name}"? This cannot be undone.`
                      }
                      className="text-xs text-danger hover:underline"
                    >
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
