import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A plain GET form, so search works with JavaScript disabled and the results
 * page stays a shareable URL. No client component needed.
 */
export function SearchForm({
  defaultValue = '',
  className,
  placeholder = 'Search instruments, part numbers, brands…',
  autoFocus = false,
}: {
  defaultValue?: string;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <form action="/search" method="get" role="search" className={cn('relative', className)}>
      <label htmlFor="site-search" className="sr-only">
        Search the site
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        id="site-search"
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </form>
  );
}
