import type { ProductSpecification } from '@/generated/prisma/client';

/** Groups keep a long sheet readable; ungrouped specs fall under one heading. */
function groupSpecifications(specifications: ProductSpecification[]) {
  const groups = new Map<string, ProductSpecification[]>();
  for (const specification of specifications) {
    const key = specification.group?.trim() || 'Specifications';
    groups.set(key, [...(groups.get(key) ?? []), specification]);
  }
  return [...groups.entries()];
}

export function SpecificationTable({ specifications }: { specifications: ProductSpecification[] }) {
  if (specifications.length === 0) return null;

  return (
    <div className="space-y-6">
      {groupSpecifications(specifications).map(([group, rows]) => (
        <div key={group}>
          <h3 className="font-display text-base font-semibold text-foreground">{group}</h3>
          <dl className="mt-3 overflow-hidden rounded-xl border border-border">
            {rows.map((row, index) => (
              <div
                key={row.id}
                className={`grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-4 ${
                  index % 2 === 1 ? 'bg-surface-muted' : 'bg-surface'
                }`}
              >
                <dt className="text-sm text-muted">{row.label}</dt>
                <dd className="text-sm text-foreground">
                  {row.value}
                  {row.unit ? <span className="text-muted"> {row.unit}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
