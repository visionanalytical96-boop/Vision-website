import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { ProductCard } from '@/components/product/ProductCard';
import { getCategoryBySlug, getPublishedProductsByCategory } from '@/lib/data/products';
import { CategoryKind } from '@/generated/prisma/client';

export async function generateMetadata(props: PageProps<'/products/[category]'>): Promise<Metadata> {
  const { category: categorySlug } = await props.params;
  const category = await getCategoryBySlug(categorySlug, CategoryKind.INSTRUMENT);
  if (!category) return {};
  return { title: category.name, description: category.description ?? undefined };
}

export default async function ProductCategoryPage(props: PageProps<'/products/[category]'>) {
  const { category: categorySlug } = await props.params;
  const category = await getCategoryBySlug(categorySlug, CategoryKind.INSTRUMENT);
  if (!category) notFound();

  const products = await getPublishedProductsByCategory(category.id);

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">{category.name}</h1>
      {category.description && <p className="mt-3 max-w-2xl text-muted">{category.description}</p>}

      {products.length === 0 ? (
        <p className="mt-10 text-muted">No instruments published in this category yet - check back soon.</p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} basePath={`/products/${category.slug}`} />
          ))}
        </div>
      )}
    </Container>
  );
}
