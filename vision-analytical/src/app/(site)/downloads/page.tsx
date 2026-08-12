import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, Lock } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { getPublishedDownloads, getBrandsWithDownloads } from '@/lib/data/downloads';
import { DOWNLOAD_KINDS, DOWNLOAD_KIND_LABELS, isDownloadKind } from '@/lib/downloads';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';
import { requireFeature } from '@/lib/data/features';

export const metadata: Metadata = {
  title: 'Downloads',
  description:
    'Datasheets, manuals, brochures, application notes and calibration certificates for the analytical instruments Vision Analytical supplies and services.',
};

export default async function DownloadsPage(props: PageProps<'/downloads'>) {
  await requireFeature('downloads');
  const searchParams = await props.searchParams;
  const rawKind = typeof searchParams.kind === 'string' ? searchParams.kind : undefined;
  const kind = isDownloadKind(rawKind) ? rawKind : undefined;
  const brandSlug = typeof searchParams.brand === 'string' ? searchParams.brand : undefined;

  const [downloads, brands] = await Promise.all([
    getPublishedDownloads({ kind, brandSlug }),
    getBrandsWithDownloads(),
  ]);

  const filterHref = (next: { kind?: string; brand?: string }) => {
    const params = new URLSearchParams();
    const nextKind = 'kind' in next ? next.kind : kind;
    const nextBrand = 'brand' in next ? next.brand : brandSlug;
    if (nextKind) params.set('kind', nextKind);
    if (nextBrand) params.set('brand', nextBrand);
    const queryString = params.toString();
    return queryString ? `/downloads?${queryString}` : '/downloads';
  };

  const chip = (active: boolean) =>
    cn(
      'rounded-full border px-3 py-1.5 text-sm',
      active ? 'border-primary bg-primary text-white' : 'border-border text-muted hover:text-foreground',
    );

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Downloads</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Datasheets, manuals, brochures and certificates for the instruments we supply and service. Can&apos;t find a
        document? Ask us — we can usually source it from the manufacturer.
      </p>

      <div className="mt-8 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Link href={filterHref({ kind: undefined })} className={chip(!kind)}>
            All types
          </Link>
          {DOWNLOAD_KINDS.map((value) => (
            <Link key={value} href={filterHref({ kind: value })} className={chip(kind === value)}>
              {DOWNLOAD_KIND_LABELS[value]}
            </Link>
          ))}
        </div>

        {brands.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Link href={filterHref({ brand: undefined })} className={chip(!brandSlug)}>
              All brands
            </Link>
            {brands.map((brand) => (
              <Link key={brand.id} href={filterHref({ brand: brand.slug })} className={chip(brandSlug === brand.slug)}>
                {brand.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {downloads.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="No documents here yet"
            description="Tell us which instrument you need documentation for and we'll send it across."
            actionLabel="Request a document"
            actionHref="/contact"
          />
        </div>
      ) : (
        <ul className="mt-10 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {downloads.map((download) => (
            <li key={download.id} className="flex flex-wrap items-center gap-4 p-5">
              <FileText className="h-5 w-5 flex-none text-primary dark:text-secondary" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold text-foreground">{download.title}</p>
                {download.description ? <p className="mt-1 text-sm text-muted">{download.description}</p> : null}
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  <span>{DOWNLOAD_KIND_LABELS[download.kind]}</span>
                  {download.brand ? <span>· {download.brand.name}</span> : null}
                  {download.fileType ? <span>· {download.fileType}</span> : null}
                  {download.fileSizeBytes ? <span>· {formatBytes(download.fileSizeBytes)}</span> : null}
                </p>
              </div>
              <a
                href={`/downloads/${download.slug}/file`}
                className="flex flex-none items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary"
              >
                {download.requiresLogin ? <Lock className="h-3.5 w-3.5" aria-hidden /> : null}
                Download
              </a>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
