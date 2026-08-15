import Link from 'next/link';
import type { Brand, InstrumentModel, ProductCompatibility } from '@/generated/prisma/client';

export type CompatibilityRow = ProductCompatibility & {
  brand: Brand;
  instrumentModel: InstrumentModel | null;
};

/**
 * Rows come in per brand: named models plus, sometimes, a brand-wide claim.
 * Showing "all systems" alongside the specific models it also lists would be
 * contradictory, so a brand-wide claim only shows when it's all there is.
 */
function groupByBrand(rows: CompatibilityRow[]) {
  const brands = new Map<string, { brand: Brand; models: InstrumentModel[]; brandWide: boolean }>();
  for (const row of rows) {
    const entry = brands.get(row.brandId) ?? { brand: row.brand, models: [], brandWide: false };
    if (row.instrumentModel) entry.models.push(row.instrumentModel);
    else entry.brandWide = true;
    brands.set(row.brandId, entry);
  }
  return [...brands.values()];
}

export function CompatibilityList({ rows }: { rows: CompatibilityRow[] }) {
  if (rows.length === 0) return null;

  return (
    <ul className="space-y-3">
      {groupByBrand(rows).map(({ brand, models, brandWide }) => (
        <li key={brand.id} className="rounded-xl border border-border bg-surface p-4">
          <Link href={`/brands/${brand.slug}`} className="font-medium text-foreground hover:text-primary">
            {brand.name}
          </Link>
          {models.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {models.map((model) => (
                <li key={model.id}>
                  <Link
                    href={`/spare-parts?brand=${brand.slug}&model=${model.slug}`}
                    className="inline-flex rounded-full border border-border bg-surface-muted px-3 py-1 text-sm text-foreground transition-colors hover:border-primary"
                  >
                    {model.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : brandWide ? (
            <p className="mt-1 text-sm text-muted">Fits {brand.name} systems generally.</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
