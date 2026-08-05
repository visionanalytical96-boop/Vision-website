import type { Metadata } from 'next';
import Link from 'next/link';
import { FlaskConical } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { getInstrumentCategories } from '@/lib/data/products';

export const metadata: Metadata = {
  title: 'Analytical Instruments',
  description: 'HPLC, GC, LC-MS, GC-MS, UV-Vis and FTIR instruments for sale, sourced from Shimadzu, Waters, Agilent and Thermo.',
};

export default async function ProductsIndexPage() {
  const categories = await getInstrumentCategories();

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Analytical Instruments</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Browse our instrument range by analytical technique. Every listing can be quoted directly - reach out for
        current pricing and lead times.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/products/${category.slug}`}
            className="group rounded-xl border border-border bg-surface p-6 shadow-sm transition-colors hover:border-blue-500"
          >
            <FlaskConical className="h-7 w-7 text-blue-600 dark:text-cyan-400" />
            <p className="mt-4 font-display text-xl font-semibold text-foreground">{category.name}</p>
            {category.description && <p className="mt-2 text-sm text-muted">{category.description}</p>}
          </Link>
        ))}
      </div>
    </Container>
  );
}
