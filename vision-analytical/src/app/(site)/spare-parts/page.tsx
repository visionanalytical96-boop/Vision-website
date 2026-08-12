import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductCard } from '@/components/product/ProductCard';
import { PartsFinder, type FinderBrand } from '@/components/product/PartsFinder';
import { getSparePartCategories, getSpareParts, getSparePartFacets } from '@/lib/data/spare-parts';
import { getPublishedInstrumentModels, getInstrumentModelByPath } from '@/lib/data/instrument-models';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Spare Parts Store',
  description:
    'Lamps, columns, seals, pump and detector parts for HPLC, GC and LC-MS systems - search by instrument, filter by part type and brand, and request a quote.',
};

function facetLinkClass(active: boolean) {
  return cn(
    'flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
    active ? 'bg-primary-light font-medium text-primary dark:bg-white/5 dark:text-secondary' : 'text-muted hover:bg-surface-muted hover:text-foreground',
  );
}

export default async function SparePartsPage(props: PageProps<'/spare-parts'>) {
  const searchParams = await props.searchParams;
  const categorySlug = typeof searchParams.category === 'string' ? searchParams.category : undefined;
  const brandSlug = typeof searchParams.brand === 'string' ? searchParams.brand : undefined;
  const modelSlug = typeof searchParams.model === 'string' ? searchParams.model : undefined;
  const query = typeof searchParams.q === 'string' ? searchParams.q : undefined;
  const inStockOnly = searchParams.stock === 'in';

  // A model filter needs its brand: model slugs are only unique per brand.
  const filters = {
    categorySlug,
    brandSlug: modelSlug ? undefined : brandSlug,
    modelBrandSlug: modelSlug ? brandSlug : undefined,
    modelSlug,
    inStockOnly,
    query,
  };

  const [categories, parts, facets, allModels, activeModel] = await Promise.all([
    getSparePartCategories(),
    getSpareParts(filters),
    getSparePartFacets(filters),
    getPublishedInstrumentModels(),
    brandSlug && modelSlug ? getInstrumentModelByPath(brandSlug, modelSlug) : null,
  ]);

  const finderBrands: FinderBrand[] = [];
  for (const model of allModels) {
    let entry = finderBrands.find((brand) => brand.slug === model.brand.slug);
    if (!entry) {
      entry = { slug: model.brand.slug, name: model.brand.name, models: [] };
      finderBrands.push(entry);
    }
    entry.models.push({ slug: model.slug, name: model.name });
  }

  function buildHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const current: Record<string, string | undefined> = {
      q: query,
      category: categorySlug,
      brand: brandSlug,
      model: modelSlug,
      stock: inStockOnly ? 'in' : undefined,
      ...overrides,
    };
    for (const [key, value] of Object.entries(current)) {
      if (value) params.set(key, value);
    }
    const queryString = params.toString();
    return queryString ? `/spare-parts?${queryString}` : '/spare-parts';
  }

  const hasFilters = Boolean(categorySlug || brandSlug || modelSlug || query || inStockOnly);

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Spare Parts Store</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Search by part name or number, or start from your instrument. Add items to your cart and submit one combined
        quote request.
      </p>

      <div className="mt-8">
        <PartsFinder brands={finderBrands} initialBrand={brandSlug} initialModel={modelSlug} />
      </div>

      <form method="GET" className="mt-6 max-w-md">
        {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
        {brandSlug && <input type="hidden" name="brand" value={brandSlug} />}
        {modelSlug && <input type="hidden" name="model" value={modelSlug} />}
        {inStockOnly && <input type="hidden" name="stock" value="in" />}
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input name="q" defaultValue={query} placeholder="Search parts (e.g. lamp, seal, 228-45103)" className="pl-9" />
        </div>
      </form>

      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-6">
          {hasFilters && (
            <Link href="/spare-parts" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline dark:text-secondary">
              <X className="h-3.5 w-3.5" />
              Clear all filters
            </Link>
          )}

          <div>
            <p className="text-sm font-semibold text-foreground">Availability</p>
            <ul className="mt-2 space-y-0.5">
              <li>
                <Link href={buildHref({ stock: undefined })} className={facetLinkClass(!inStockOnly)}>
                  <span>Any availability</span>
                </Link>
              </li>
              <li>
                <Link href={buildHref({ stock: 'in' })} className={facetLinkClass(inStockOnly)}>
                  <span>In stock only</span>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Part type</p>
            <ul className="mt-2 space-y-0.5">
              <li>
                <Link href={buildHref({ category: undefined })} className={facetLinkClass(!categorySlug)}>
                  <span>All part types</span>
                </Link>
              </li>
              {categories.map((category) => {
                const count = facets.countByCategoryId.get(category.id) ?? 0;
                if (count === 0 && categorySlug !== category.slug) return null;
                return (
                  <li key={category.id}>
                    <Link href={buildHref({ category: category.slug })} className={facetLinkClass(categorySlug === category.slug)}>
                      <span className="min-w-0 truncate">{category.name}</span>
                      <span className="flex-none text-xs tabular-nums text-muted">{count}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Fits brand</p>
            <ul className="mt-2 space-y-0.5">
              <li>
                <Link href={buildHref({ brand: undefined, model: undefined })} className={facetLinkClass(!brandSlug)}>
                  <span>All brands</span>
                </Link>
              </li>
              {facets.brands.map((brand) => (
                <li key={brand.id}>
                  <Link
                    href={buildHref({ brand: brand.slug, model: undefined })}
                    className={facetLinkClass(brandSlug === brand.slug && !modelSlug)}
                  >
                    <span className="min-w-0 truncate">{brand.name}</span>
                    <span className="flex-none text-xs tabular-nums text-muted">{brand.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {facets.total} {facets.total === 1 ? 'part' : 'parts'}
              {activeModel ? (
                <>
                  {' '}
                  for <span className="font-medium text-foreground">{activeModel.brand.name} {activeModel.name}</span>
                </>
              ) : null}
            </p>
            {activeModel && (
              <Link href={buildHref({ model: undefined })} className="text-sm text-primary hover:underline dark:text-secondary">
                Show all {activeModel.brand.name} parts
              </Link>
            )}
          </div>

          {parts.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="No parts match those filters"
                description="We source parts that aren't listed — tell us the instrument and part number and we'll come back with availability."
                actionLabel="Request a part"
                actionHref="/request-quote"
              />
            </div>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {parts.map((part) => (
                <li key={part.id}>
                  <ProductCard product={part} basePath="/spare-parts" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Container>
  );
}
