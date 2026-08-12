import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { ProductCard } from '@/components/product/ProductCard';
import { CatalogueFacets, type FacetGroup } from '@/components/product/CatalogueFacets';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  getCategoryBySlug,
  getPublishedInstruments,
  getInstrumentFacets,
  type InstrumentSort,
} from '@/lib/data/products';
import { CategoryKind } from '@/generated/prisma/client';
import { cn } from '@/lib/utils';

export async function generateMetadata(props: PageProps<'/products/[category]'>): Promise<Metadata> {
  const { category: categorySlug } = await props.params;
  const category = await getCategoryBySlug(categorySlug, CategoryKind.INSTRUMENT);
  if (!category) return {};
  return { title: category.name, description: category.description ?? undefined };
}

const SORTS: { value: InstrumentSort; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
];

function isSort(value: string | undefined): value is InstrumentSort {
  return SORTS.some((sort) => sort.value === value);
}

export default async function ProductCategoryPage(props: PageProps<'/products/[category]'>) {
  const [{ category: categorySlug }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const found = await getCategoryBySlug(categorySlug, CategoryKind.INSTRUMENT);
  if (!found) notFound();
  // Bound to a const so the href builder below keeps the narrowed type.
  const category = found;

  const brandSlug = typeof searchParams.brand === 'string' ? searchParams.brand : undefined;
  const inStockOnly = searchParams.stock === 'in';
  const rawSort = typeof searchParams.sort === 'string' ? searchParams.sort : undefined;
  const sort = isSort(rawSort) ? rawSort : 'name';

  const filters = { categoryId: category.id, brandSlug, inStockOnly, sort };
  const [products, facets] = await Promise.all([getPublishedInstruments(filters), getInstrumentFacets(filters)]);

  function buildHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const current: Record<string, string | undefined> = {
      brand: brandSlug,
      stock: inStockOnly ? 'in' : undefined,
      sort: sort === 'name' ? undefined : sort,
      ...overrides,
    };
    for (const [key, value] of Object.entries(current)) {
      if (value) params.set(key, value);
    }
    const queryString = params.toString();
    return queryString ? `/products/${category.slug}?${queryString}` : `/products/${category.slug}`;
  }

  const groups: FacetGroup[] = [
    {
      title: 'Availability',
      options: [
        { id: 'stock-any', label: 'Any availability', href: buildHref({ stock: undefined }), active: !inStockOnly },
        { id: 'stock-in', label: 'In stock only', href: buildHref({ stock: 'in' }), count: facets.inStock, active: inStockOnly },
      ],
    },
    {
      title: 'Brand',
      options: [
        { id: 'brand-all', label: 'All brands', href: buildHref({ brand: undefined }), active: !brandSlug },
        ...facets.brands.map((brand) => ({
          id: brand.id,
          label: brand.name,
          href: buildHref({ brand: brand.slug }),
          count: brand.count,
          active: brandSlug === brand.slug,
        })),
      ],
    },
  ];

  const hasFilters = Boolean(brandSlug || inStockOnly || sort !== 'name');

  return (
    <Container className="py-12 sm:py-16">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-primary">
          Home
        </Link>
        <span aria-hidden>/</span>
        <Link href="/products" className="hover:text-primary">
          Instruments
        </Link>
        <span aria-hidden>/</span>
        <span className="font-medium text-foreground">{category.name}</span>
      </nav>

      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{category.name}</h1>
      {category.description && <p className="mt-3 max-w-2xl text-muted">{category.description}</p>}

      <div className="mt-10 grid gap-8 lg:grid-cols-[240px_1fr]">
        <CatalogueFacets groups={groups} clearHref={hasFilters ? `/products/${category.slug}` : undefined} />

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {facets.total} {facets.total === 1 ? 'instrument' : 'instruments'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted">Sort</span>
              {SORTS.map((option) => (
                <Link
                  key={option.value}
                  href={buildHref({ sort: option.value === 'name' ? undefined : option.value })}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm',
                    sort === option.value
                      ? 'border-primary bg-primary text-white'
                      : 'border-border text-muted hover:text-foreground',
                  )}
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </div>

          {products.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="No instruments match those filters"
                description="We supply more than we list — tell us what you need and we'll come back with options and pricing."
                actionLabel="Request a quote"
                actionHref="/request-quote"
              />
            </div>
          ) : (
            <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} basePath={`/products/${category.slug}`} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Container>
  );
}
