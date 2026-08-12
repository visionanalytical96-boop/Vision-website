import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, TriangleAlert } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { lookupErrorCodes } from '@/lib/data/knowledge';
import { requireFeature } from '@/lib/data/features';

export const metadata: Metadata = {
  title: 'Error Code Lookup',
  description:
    'Look up an analytical instrument error code and find what it means, what causes it and how to clear it — HPLC, GC, LC-MS and UV/Vis systems.',
};

export default async function ErrorCodesPage(props: PageProps<'/error-codes'>) {
  await requireFeature('knowledge_center');
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === 'string' ? searchParams.q : '';

  const matches = await lookupErrorCodes(query);

  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-2xl">
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-primary dark:text-secondary">
          <TriangleAlert className="h-4 w-4" />
          Error codes
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          What does this error mean?
        </h1>
        <p className="mt-3 text-muted">
          Type the code exactly as your instrument shows it. Punctuation and spacing don&apos;t matter —{' '}
          <span className="font-mono">E-1201</span>, <span className="font-mono">E1201</span> and{' '}
          <span className="font-mono">e 1201</span> all find the same entry.
        </p>
      </div>

      <form method="GET" role="search" className="mt-8 max-w-md">
        <label htmlFor="error-code" className="sr-only">
          Error code
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            id="error-code"
            name="q"
            defaultValue={query}
            placeholder="e.g. E-1201"
            className="pl-9 font-mono"
            autoFocus
          />
        </div>
      </form>

      {matches.length === 0 ? (
        <div className="mt-10 max-w-2xl">
          <EmptyState
            title={query ? `No entry for “${query}” yet` : 'No error codes published yet'}
            description="Tell us the instrument and the exact code — our engineers will diagnose it, and the answer becomes an entry here."
            actionLabel="Ask an engineer"
            actionHref="/contact"
          />
        </div>
      ) : (
        <>
          <p className="mt-8 text-sm text-muted">
            {matches.length} {matches.length === 1 ? 'entry' : 'entries'}
            {query ? ` matching “${query}”` : ''}
          </p>
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {matches.map((match) => (
              <li key={match.id}>
                <Link href={`/blog/${match.slug}`} className="flex flex-col gap-2 p-5 transition-colors hover:bg-surface-muted">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-mono text-sm font-semibold text-primary dark:text-secondary">
                      {match.errorCode}
                    </span>
                    <span className="font-display font-semibold text-foreground">{match.title}</span>
                  </div>
                  <p className="text-sm text-muted">{match.excerpt}</p>
                  {(match.brands.length > 0 || match.models.length > 0) && (
                    <p className="text-xs text-muted">
                      {[...match.models, ...match.brands].join(' · ')}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Container>
  );
}
