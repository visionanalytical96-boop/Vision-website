import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchForm } from '@/components/search/SearchForm';
import { search, type SearchGroup } from '@/lib/data/search';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search Vision Analytical instruments, spare parts, refurbished systems, brands and technical articles.',
  // A results page has nothing durable to index.
  robots: { index: false, follow: true },
};

const GROUP_ORDER: SearchGroup[] = ['Instruments', 'Spare parts', 'Refurbished', 'Brands', 'Knowledge Center'];

function isSearchGroup(value: string | undefined): value is SearchGroup {
  return GROUP_ORDER.some((group) => group === value);
}

export default async function SearchPage(props: PageProps<'/search'>) {
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === 'string' ? searchParams.q : '';
  const rawGroup = typeof searchParams.group === 'string' ? searchParams.group : undefined;
  const activeGroup = isSearchGroup(rawGroup) ? rawGroup : undefined;

  const results = await search(query);
  const visibleHits = activeGroup ? results.hits.filter((hit) => hit.group === activeGroup) : results.hits;

  const filterHref = (group?: SearchGroup) =>
    group ? `/search?q=${encodeURIComponent(query)}&group=${encodeURIComponent(group)}` : `/search?q=${encodeURIComponent(query)}`;

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Search</h1>
      <SearchForm defaultValue={query} className="mt-6 max-w-xl" autoFocus />

      {query.trim().length < 2 ? (
        <p className="mt-8 text-muted">Type at least two characters — a product name, a part number or a brand.</p>
      ) : results.total === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={`Nothing found for “${query}”`}
            description="Try a shorter search, a part number, or ask us directly — we source parts that aren't listed."
            actionLabel="Contact us"
            actionHref="/contact"
          />
        </div>
      ) : (
        <>
          <p className="mt-8 text-sm text-muted">
            {results.total} {results.total === 1 ? 'result' : 'results'} for “{query}”
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={filterHref()}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm',
                !activeGroup ? 'border-primary bg-primary text-white' : 'border-border text-muted hover:text-foreground',
              )}
            >
              All ({results.total})
            </Link>
            {GROUP_ORDER.filter((group) => results.countsByGroup[group] > 0).map((group) => (
              <Link
                key={group}
                href={filterHref(group)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm',
                  activeGroup === group
                    ? 'border-primary bg-primary text-white'
                    : 'border-border text-muted hover:text-foreground',
                )}
              >
                {group} ({results.countsByGroup[group]})
              </Link>
            ))}
          </div>

          <ul className="mt-8 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {visibleHits.map((hit) => (
              <li key={`${hit.group}-${hit.id}`}>
                <Link href={hit.href} className="flex flex-col gap-1 p-5 transition-colors hover:bg-surface-muted">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-display font-semibold text-foreground">{hit.title}</span>
                    <span className="text-xs uppercase tracking-[0.08em] text-muted">{hit.group}</span>
                  </div>
                  {hit.subtitle ? <p className="line-clamp-2 text-sm text-muted">{hit.subtitle}</p> : null}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Container>
  );
}
