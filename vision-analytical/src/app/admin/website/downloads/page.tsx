import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { buttonVariants } from '@/components/ui/Button';
import { ConfirmSubmitButton } from '@/components/forms/ConfirmSubmitButton';
import { getAllDownloads } from '@/lib/data/downloads';
import { deleteDownload, toggleDownloadPublished } from '@/lib/actions/admin-downloads';
import { DOWNLOAD_KIND_LABELS } from '@/lib/downloads';

export const metadata: Metadata = { title: 'Downloads' };

export default async function AdminDownloadsPage() {
  const downloads = await getAllDownloads();

  if (downloads.length === 0) {
    return (
      <EmptyState
        title="No downloads yet"
        description="Publish datasheets, manuals, brochures and certificates for the instruments you supply."
        actionLabel="Add Download"
        actionHref="/admin/website/downloads/new"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/admin/website/downloads/new" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
          <Plus className="h-4 w-4" />
          Add Download
        </Link>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Title</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Brand</TableHeaderCell>
            <TableHeaderCell>Downloads</TableHeaderCell>
            <TableHeaderCell>Published</TableHeaderCell>
            <TableHeaderCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {downloads.map((download) => (
            <TableRow key={download.id}>
              <TableCell>{download.title}</TableCell>
              <TableCell>{DOWNLOAD_KIND_LABELS[download.kind]}</TableCell>
              <TableCell>{download.brand?.name ?? '—'}</TableCell>
              <TableCell className="tabular-nums">{download.downloadCount}</TableCell>
              <TableCell>
                <form action={toggleDownloadPublished}>
                  <input type="hidden" name="id" value={download.id} />
                  <button type="submit" className="text-xs">
                    {download.isPublished ? (
                      <span className="text-success">Published</span>
                    ) : (
                      <span className="text-muted">Draft</span>
                    )}
                  </button>
                </form>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/website/downloads/${download.id}`}
                    className="text-primary hover:underline dark:text-secondary"
                    aria-label={`Edit ${download.title}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <form action={deleteDownload}>
                    <input type="hidden" name="id" value={download.id} />
                    <ConfirmSubmitButton
                      confirmMessage={`Delete "${download.title}"? This cannot be undone.`}
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
