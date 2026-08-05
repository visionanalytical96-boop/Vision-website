import type { Metadata } from 'next';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { getRefurbishedCategories } from '@/lib/data/refurbished';

export const metadata: Metadata = {
  title: 'Refurbished Instruments',
  description: 'Tested, validated and warranty-backed pre-owned HPLC, GC, LC-MS and UV-Vis systems.',
};

export default async function RefurbishedIndexPage() {
  const categories = await getRefurbishedCategories();

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Refurbished Instruments</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Every refurbished system is function-tested and validated before listing, with included accessories and a
        warranty period stated upfront.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/refurbished/${category.slug}`}
            className="group rounded-xl border border-border bg-surface p-6 shadow-sm transition-colors hover:border-blue-500"
          >
            <RefreshCw className="h-7 w-7 text-blue-600 dark:text-cyan-400" />
            <p className="mt-4 font-display text-xl font-semibold text-foreground">{category.name}</p>
          </Link>
        ))}
      </div>
    </Container>
  );
}
