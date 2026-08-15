import type { Metadata } from 'next';
import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { listMediaFiles } from '@/lib/media';
import { deleteMedia } from '@/lib/actions/media';
import { MediaUploadForm } from '@/components/forms/cms/MediaUploadForm';
import { ConfirmSubmitButton } from '@/components/forms/ConfirmSubmitButton';
import { formatBytes, formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Media Library' };

export default async function AdminMediaPage() {
  const files = await listMediaFiles();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-medium text-foreground">Upload a new image</p>
        <p className="mt-1 text-sm text-muted">
          Uploaded here for later use - copy its URL, or attach it to content from the relevant edit page.
        </p>
        <div className="mt-3">
          <MediaUploadForm />
        </div>
      </div>

      {files.length === 0 ? (
        <p className="text-sm text-muted">No uploaded images yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {files.map((file) => (
            <div key={file.url} className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
              <div className="relative aspect-square bg-surface-muted">
                <Image src={file.url} alt="" fill sizes="(min-width: 1024px) 20vw, 40vw" className="object-cover" />
              </div>
              <div className="space-y-1 p-3">
                <p className="truncate text-xs font-medium text-foreground" title={file.filename}>
                  {file.filename}
                </p>
                <p className="text-xs text-muted">
                  {file.category} &middot; {formatBytes(file.sizeBytes)}
                </p>
                <p className="text-xs text-muted">{formatDateTime(file.uploadedAt)}</p>
                {file.inUse ? (
                  <span className="inline-block rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success">In use</span>
                ) : (
                  <span className="inline-block rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted">Unused</span>
                )}
                <form action={deleteMedia} className="pt-1">
                  <input type="hidden" name="url" value={file.url} />
                  <ConfirmSubmitButton
                    confirmMessage={
                      file.inUse
                        ? `"${file.filename}" is currently used somewhere on the site. Delete it anyway? Any page using it will show a broken image.`
                        : `Delete "${file.filename}"? This cannot be undone.`
                    }
                    className="flex items-center gap-1 text-xs text-danger hover:underline"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
