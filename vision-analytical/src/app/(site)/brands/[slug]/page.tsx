import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { ProductCard } from '@/components/product/ProductCard';
import { buttonVariants } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProductImage } from '@/components/product/ProductImage';
import { JsonLd } from '@/components/seo/JsonLd';
import { stockStatusMeta } from '@/lib/status';
import { toImageList } from '@/lib/image-list';
import { getBrandHubBySlug } from '@/lib/data/brands';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export async function generateMetadata(props: PageProps<'/brands/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const hub = await getBrandHubBySlug(slug);
  if (!hub) return {};
  return {
    title: hub.brand.seoTitle ?? `${hub.brand.name} instruments, parts & service`,
    description:
      hub.brand.seoDescription ??
      `Vision Analytical supplies, services and stocks spare parts for ${hub.brand.name} analytical instruments.`,
  };
}

export default async function BrandHubPage(props: PageProps<'/brands/[slug]'>) {
  const { slug } = await props.params;
  const hub = await getBrandHubBySlug(slug);
  if (!hub) notFound();

  const { brand, instruments, spareParts, refurbished } = hub;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Brand',
    name: brand.name,
    ...(brand.logoUrl ? { logo: `${SITE_URL}${brand.logoUrl}` } : {}),
    ...(brand.website ? { sameAs: brand.website } : {}),
  };

  return (
    <>
      <JsonLd data={schema} />
      <Container className="py-14 sm:py-20">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-muted" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <span aria-hidden>/</span>
          <Link href="/brands" className="hover:text-primary">
            Brands
          </Link>
          <span aria-hidden>/</span>
          <span className="font-medium text-foreground">{brand.name}</span>
        </nav>

        <header className="mt-6 flex flex-col gap-5 border-b border-border pb-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            {brand.logoUrl ? (
              <Image
                src={brand.logoUrl}
                alt={brand.name}
                width={180}
                height={52}
                className="max-h-12 w-auto object-contain"
              />
            ) : null}
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {brand.name}
            </h1>
            {brand.description && <p className="mt-4 text-muted">{brand.description}</p>}
          </div>
          <div className="flex flex-none flex-col gap-2">
            <Link href={`/contact?brand=${brand.slug}`} className={buttonVariants({ variant: 'primary' })}>
              Request a quote
            </Link>
            <Link href="/services" className={buttonVariants({ variant: 'outline' })}>
              Service &amp; AMC options
            </Link>
          </div>
        </header>

        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold text-foreground">Instruments</h2>
          {instruments.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              We support {brand.name} instruments — contact us for current availability.
            </p>
          ) : (
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {instruments.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} basePath={`/products/${product.category.slug}`} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold text-foreground">Spare parts &amp; consumables</h2>
          {spareParts.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Ask us about {brand.name} spare parts — we stock and source consumables and service parts.
            </p>
          ) : (
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {spareParts.map((part) => (
                <li key={part.id}>
                  <ProductCard product={part} basePath="/spare-parts" />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold text-foreground">Refurbished units</h2>
          {refurbished.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No refurbished {brand.name} units listed right now.</p>
          ) : (
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {refurbished.map((unit) => (
                <li key={unit.id}>
                  <Link
                    href={`/refurbished/${unit.category.slug}/${unit.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-colors hover:border-primary"
                  >
                    <ProductImage
                      images={toImageList(unit.images)}
                      alt={unit.name}
                      className="h-40 w-full"
                      sizes="(min-width: 1024px) 25vw, 50vw"
                    />
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-display font-semibold text-foreground">{unit.name}</p>
                        <StatusBadge meta={stockStatusMeta[unit.stockStatus]} />
                      </div>
                      <p className="text-xs text-muted">
                        {unit.brand.name}
                        {unit.warrantyMonths > 0 ? ` · ${unit.warrantyMonths} month warranty` : ''}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </>
  );
}
