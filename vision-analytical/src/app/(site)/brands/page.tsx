import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { getBrandsWithCounts } from '@/lib/data/brands';

export const metadata: Metadata = {
  title: 'Brands We Sell & Service',
  description:
    'Vision Analytical supplies, services and stocks spare parts for Waters, Shimadzu, Agilent, Thermo Fisher, PerkinElmer and other analytical instrument manufacturers.',
};

export default async function BrandsPage() {
  const brands = await getBrandsWithCounts();

  return (
    <Container className="py-14 sm:py-20">
      <div className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-primary dark:text-secondary">Brands</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Instruments we sell, service and stock parts for
        </h1>
        <p className="mt-4 text-muted">
          Our engineers are trained across the major chromatography and spectroscopy platforms. If your instrument is
          not listed here, we very likely still support it — ask us.
        </p>
      </div>

      {brands.length === 0 ? (
        <p className="mt-10 text-muted">Brand pages are being prepared.</p>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => {
            const items = brand._count.products + brand._count.refurbishedInstruments;
            return (
              <li key={brand.id}>
                <Link
                  href={`/brands/${brand.slug}`}
                  className="flex h-full flex-col gap-3 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary"
                >
                  <div className="flex h-12 items-center">
                    {brand.logoUrl ? (
                      <Image
                        src={brand.logoUrl}
                        alt={brand.name}
                        width={140}
                        height={40}
                        className="max-h-10 w-auto object-contain"
                      />
                    ) : (
                      <span className="font-display text-xl font-semibold text-foreground">{brand.name}</span>
                    )}
                  </div>
                  {brand.description && <p className="line-clamp-2 text-sm text-muted">{brand.description}</p>}
                  <p className="mt-auto text-xs text-muted">
                    {items > 0 ? `${items} listed ${items === 1 ? 'item' : 'items'}` : 'Service & parts support'}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
