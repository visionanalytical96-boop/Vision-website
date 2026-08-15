import { FileText, Lock } from 'lucide-react';
import type { Download } from '@/generated/prisma/client';
import { DOWNLOAD_KIND_LABELS } from '@/lib/downloads';
import { formatBytes } from '@/lib/format';

/** Documents attached to a product, shown on its page. */
export function DocumentList({ documents }: { documents: Download[] }) {
  if (documents.length === 0) return null;

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {documents.map((document) => (
        <li key={document.id} className="flex flex-wrap items-center gap-3 p-4">
          <FileText className="h-4 w-4 flex-none text-primary dark:text-secondary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">{document.title}</p>
            <p className="text-xs text-muted">
              {DOWNLOAD_KIND_LABELS[document.kind]}
              {document.fileType ? ` · ${document.fileType}` : ''}
              {document.fileSizeBytes ? ` · ${formatBytes(document.fileSizeBytes)}` : ''}
            </p>
          </div>
          <a
            href={`/downloads/${document.slug}/file`}
            className="flex flex-none items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary"
          >
            {document.requiresLogin ? <Lock className="h-3.5 w-3.5" aria-hidden /> : null}
            Download
          </a>
        </li>
      ))}
    </ul>
  );
}
