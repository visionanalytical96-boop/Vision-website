import type { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { ProductCard } from '@/components/product/ProductCard';
import { getSparePartCategories, getSpareParts, SPARE_PART_BRANDS } from '@/lib/data/spare-parts';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Spare Parts Store',
  description:
    'Lamps, columns, seals, pump and detector parts for HPLC, GC and LC-MS systems - search, filter and request a quote.',
};

function activeLinkClass(active: boolean) {
  return cn('text-sm', active ? 'font-medium text-blue-600 dark:text-cyan-400' : 'text-muted hover:text-foreground');
}

export default async function SparePartsPage(props: PageProps<'/spare-parts'>) {
  const searchParams = await props.searchParams;
  const categorySlug = typeof searchParams.category === 'string' ? searchParams.category : undefined;
  const brand = typeof searchParams.brand === 'string' ? searchParams.brand : undefined;
  const query = typeof searchParams.q === 'string' ? searchParams.q : undefined;

  const [categories, parts] = await Promise.all([
    getSparePartCategories(),
    getSpareParts({ categorySlug, brand, query }),
  ]);

  function buildHref(overrides: { category?: string } | { brand?: string }) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    const nextCategory = 'category' in overrides ? overrides.category : categorySlug;
    const nextBrand = 'brand' in overrides ? overrides.brand : brand;
    if (nextCategory) params.set('category', nextCategory);
    if (nextBrand) params.set('brand', nextBrand);
    const qs = params.toString();
    return qs ? `/spare-parts?${qs}` : '/spare-parts';
  }

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Spare Parts Store</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Search our spare parts catalog by name, or filter by part type and brand. Add items to your cart and submit
        one combined quote request.
      </p>

      <form method="GET" className="mt-8 max-w-md">
        {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
        {brand && <input type="hidden" name="brand" value={brand} />}
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input name="q" defaultValue={query} placeholder="Search parts (e.g. lamp, seal, column)" className="pl-9" />
        </div>
      </form>

      <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-6">
          <div>
            <p className="text-sm font-semibold text-foreground">Category</p>
            <ul className="mt-2 space-y-1">
              <li>
                <Link href={buildHref({ category: undefined })} className={activeLinkClass(!categorySlug)}>
                  All categories
                </Link>
              </li>
              {categories.map((category) => (
                <li key={category.id}>
                  <Link href={buildHref({ category: category.slug })} className={activeLinkClass(categorySlug === category.slug)}>
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Brand</p>
            <ul className="mt-2 space-y-1">
              <li>
                <Link href={buildHref({ brand: undefined })} className={activeLinkClass(!brand)}>
                  All brands
                </Link>
              </li>
              {SPARE_PART_BRANDS.map((brandName) => (
                <li key={brandName}>
                  <Link href={buildHref({ brand: brandName })} className={activeLinkClass(brand === brandName)}>
                    {brandName}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div>
          {parts.length === 0 ? (
            <p className="text-muted">No parts match your filters. Try clearing a filter or searching a different term.</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {parts.map((part) => (
                <ProductCard key={part.id} product={part} basePath="/spare-parts" />
              ))}
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
