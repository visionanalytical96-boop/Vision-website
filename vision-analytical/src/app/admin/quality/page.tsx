import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock, FileEdit, ImageOff } from 'lucide-react';
import { getQualityReport, getContentQueue, getUnmappedInstrumentModels, getBrokenImages } from '@/lib/data/admin-quality';
import { formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Data Quality' };

export default async function AdminQualityPage() {
  const [report, queue, unmappedModels, brokenImages] = await Promise.all([
    getQualityReport(),
    getContentQueue(),
    getUnmappedInstrumentModels(),
    getBrokenImages(),
  ]);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Catalogue completeness</p>
            <p className="mt-1 font-display text-3xl font-bold tabular-nums text-foreground">
              {report.completionPercent}%
            </p>
            <p className="mt-1 text-sm text-muted">
              {report.completeProducts} of {report.totalProducts} published products have nothing outstanding.
            </p>
          </div>
          {report.issues.length === 0 ? (
            <p className="flex items-center gap-2 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" />
              Nothing outstanding
            </p>
          ) : null}
        </div>
        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuenow={report.completionPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Catalogue completeness"
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${report.completionPercent}%` }} />
        </div>
      </section>

      {report.issues.length > 0 && (
        <section>
          <h2 className="font-display text-base font-semibold text-foreground">Needs attention</h2>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2">
            {report.issues.map((issue) => (
              <li key={issue.key} className="rounded-xl border border-border bg-surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium text-foreground">
                      <AlertTriangle className="h-4 w-4 flex-none text-warning" aria-hidden />
                      {issue.label}
                    </p>
                    <p className="mt-1 text-sm text-muted">{issue.description}</p>
                  </div>
                  <span className="flex-none font-display text-2xl font-semibold tabular-nums text-foreground">
                    {issue.count}
                  </span>
                </div>
                <ul className="mt-3 space-y-1">
                  {issue.samples.map((sample) => (
                    <li key={sample.id}>
                      <Link
                        href={sample.href}
                        className="text-sm text-primary hover:underline dark:text-secondary"
                      >
                        {sample.name}
                      </Link>
                    </li>
                  ))}
                  {issue.count > issue.samples.length && (
                    <li className="text-sm text-muted">and {issue.count - issue.samples.length} more…</li>
                  )}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      {brokenImages.length > 0 && (
        <section>
          <h2 className="font-display text-base font-semibold text-foreground">Broken images</h2>
          <p className="mt-1 text-sm text-muted">
            Referenced in the database but missing from disk. Re-upload the image, or clear the reference.
          </p>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {brokenImages.map((image) => (
              <li key={`${image.href}-${image.url}`} className="flex flex-wrap items-center gap-3 p-4">
                <ImageOff className="h-4 w-4 flex-none text-danger" aria-hidden />
                <Link href={image.href} className="min-w-0 flex-1 font-medium text-foreground hover:text-primary">
                  {image.usedBy}
                </Link>
                <code className="flex-none font-mono text-xs text-muted">{image.url}</code>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-display text-base font-semibold text-foreground">Content workflow</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="text-sm text-muted">Drafts</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">{queue.drafts}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="text-sm text-muted">Waiting for review</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">
              {queue.inReview.length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="text-sm text-muted">Approved, not yet live</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">{queue.approved}</p>
          </div>
        </div>

        {queue.inReview.length > 0 && (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {queue.inReview.map((post) => (
              <li key={post.id} className="flex flex-wrap items-center gap-3 p-4">
                <FileEdit className="h-4 w-4 flex-none text-warning" aria-hidden />
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/blog/${post.id}`} className="font-medium text-foreground hover:text-primary">
                    {post.title}
                  </Link>
                  {post.reviewNote ? <p className="mt-0.5 text-sm text-muted">{post.reviewNote}</p> : null}
                </div>
                <span className="flex-none text-xs text-muted">since {formatDateTime(post.updatedAt)}</span>
              </li>
            ))}
          </ul>
        )}

        {queue.scheduled.length > 0 && (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {queue.scheduled.map((post) => (
              <li key={post.id} className="flex flex-wrap items-center gap-3 p-4">
                <Clock className="h-4 w-4 flex-none text-info" aria-hidden />
                <Link href={`/admin/blog/${post.id}`} className="min-w-0 flex-1 font-medium text-foreground hover:text-primary">
                  {post.title}
                </Link>
                <span className="flex-none text-xs text-muted">goes live {formatDateTime(post.publishAt!)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {unmappedModels.length > 0 && (
        <section>
          <h2 className="font-display text-base font-semibold text-foreground">Instrument models with no parts</h2>
          <p className="mt-1 text-sm text-muted">
            A customer picking one of these in the parts finder sees only universal fittings.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {unmappedModels.map((model) => (
              <li key={model.id}>
                <Link
                  href={`/admin/products/instrument-models/${model.id}`}
                  className="inline-flex rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary"
                >
                  {model.brand.name} {model.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
