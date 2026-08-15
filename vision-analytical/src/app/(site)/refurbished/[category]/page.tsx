import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { RefurbishedCard } from '@/components/product/RefurbishedCard';
import { getRefurbishedCategoryBySlug, getRefurbishedInstrumentsByCategory } from '@/lib/data/refurbished';
import { requireFeature } from '@/lib/data/features';

export async function generateMetadata(props: PageProps<'/refurbished/[category]'>): Promise<Metadata> {
  const { category: categorySlug } = await props.params;
  const category = await getRefurbishedCategoryBySlug(categorySlug);
  if (!category) return {};
  return { title: `Refurbished ${category.name}` };
}

export default async function RefurbishedCategoryPage(props: PageProps<'/refurbished/[category]'>) {
  await requireFeature('refurbished');
  const { category: categorySlug } = await props.params;
  const category = await getRefurbishedCategoryBySlug(categorySlug);
  if (!category) notFound();

  const instruments = await getRefurbishedInstrumentsByCategory(category.id);

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Refurbished {category.name}</h1>

      {instruments.length === 0 ? (
        <p className="mt-10 text-muted">No refurbished units in this category right now - check back soon.</p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {instruments.map((instrument) => (
            <RefurbishedCard key={instrument.id} instrument={instrument} basePath={`/refurbished/${category.slug}`} />
          ))}
        </div>
      )}
    </Container>
  );
}
