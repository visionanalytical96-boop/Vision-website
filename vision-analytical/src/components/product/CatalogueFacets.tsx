import Link from 'next/link';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FacetOption {
  id: string;
  label: string;
  href: string;
  count?: number;
  active: boolean;
}

export interface FacetGroup {
  title: string;
  options: FacetOption[];
}

function optionClass(active: boolean) {
  return cn(
    'flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
    active
      ? 'bg-primary-light font-medium text-primary dark:bg-white/5 dark:text-secondary'
      : 'text-muted hover:bg-surface-muted hover:text-foreground',
  );
}

/** The filter rail shared by the instrument catalogue and any list like it. */
export function CatalogueFacets({ groups, clearHref }: { groups: FacetGroup[]; clearHref?: string }) {
  return (
    <aside className="space-y-6">
      {clearHref ? (
        <Link href={clearHref} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline dark:text-secondary">
          <X className="h-3.5 w-3.5" />
          Clear all filters
        </Link>
      ) : null}

      {groups.map((group) => (
        <div key={group.title}>
          <p className="text-sm font-semibold text-foreground">{group.title}</p>
          <ul className="mt-2 space-y-0.5">
            {group.options.map((option) => (
              <li key={option.id}>
                <Link href={option.href} className={optionClass(option.active)}>
                  <span className="min-w-0 truncate">{option.label}</span>
                  {typeof option.count === 'number' ? (
                    <span className="flex-none text-xs tabular-nums text-muted">{option.count}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}
