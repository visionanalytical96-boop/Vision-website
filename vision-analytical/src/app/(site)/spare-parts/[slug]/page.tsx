import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { ProductImage } from '@/components/product/ProductImage';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AddToCartButton } from '@/components/forms/AddToCartButton';
import { buttonVariants } from '@/components/ui/Button';
import { JsonLd } from '@/components/seo/JsonLd';
import { getSparePartBySlug } from '@/lib/data/spare-parts';
import { getRelatedSpareParts } from '@/lib/data/products';
import { ProductCard } from '@/components/product/ProductCard';
import { SpecificationTable } from '@/components/product/SpecificationTable';
import { CompatibilityList } from '@/components/product/CompatibilityList';
import { DocumentList } from '@/components/product/DocumentList';
import { getSiteSettings } from '@/lib/data/cms';
import { stockStatusMeta } from '@/lib/status';
import { formatMinorAmount } from '@/lib/format';
import { whatsappLink } from '@/lib/contact-links';
import { toImageList } from '@/lib/image-list';
import { buildProductSchema } from '@/lib/seo/product-schema';
import { StockStatus } from '@/generated/prisma/enums';
import { requireFeature } from '@/lib/data/features';

export async function generateMetadata(props: PageProps<'/spare-parts/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const part = await getSparePartBySlug(slug);
  if (!part) return {};
  return { title: part.seoTitle ?? part.name, description: part.seoDescription ?? part.description };
}

export default async function SparePartDetailPage(props: PageProps<'/spare-parts/[slug]'>) {
  await requireFeature('spare_parts');
  const { slug } = await props.params;
  const [part, settings] = await Promise.all([getSparePartBySlug(slug), getSiteSettings()]);
  if (!part) notFound();

  const relatedParts = await getRelatedSpareParts(part.id);

  const schema = buildProductSchema({
    name: part.name,
    description: part.description,
    path: `/spare-parts/${part.slug}`,
    images: toImageList(part.images),
    priceMinor: part.priceMinor,
    inStock: part.stockStatus !== StockStatus.OUT_OF_STOCK,
    sku: part.sku,
  });

  return (
    <Container className="py-12 sm:py-16">
      <JsonLd data={schema} />
      <div className="grid gap-10 lg:grid-cols-2">
        <ProductImage images={toImageList(part.images)} alt={part.name} className="aspect-square w-full rounded-2xl" />

        <div>
          <p className="text-sm text-muted">
            <Link href={`/spare-parts?category=${part.category.slug}`} className="hover:text-foreground">
              {part.category.name}
            </Link>
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-foreground">{part.name}</h1>
          <p className="mt-1 font-mono text-xs text-muted">SKU: {part.sku}</p>

          <div className="mt-4 flex items-center gap-3">
            <StatusBadge meta={stockStatusMeta[part.stockStatus]} />
            <span className="font-medium text-foreground">
              {part.priceMinor ? formatMinorAmount(part.priceMinor) : 'Contact for pricing'}
            </span>
          </div>

          <p className="mt-6 leading-relaxed text-muted">{part.description}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <AddToCartButton kind="PRODUCT" id={part.id} slug={part.slug} name={part.name} sku={part.sku} />
            <Link href={`/request-quote?product=${part.slug}`} className={buttonVariants({ variant: 'primary' })}>
              Request Quote
            </Link>
            <a
              href={whatsappLink(settings?.whatsappNumber, `Hi, I'm looking for: ${part.name} (SKU ${part.sku}).`)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'outline' })}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      {part.compatibility.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-xl font-semibold text-foreground">Fits these instruments</h2>
          <div className="mt-4">
            <CompatibilityList rows={part.compatibility} />
          </div>
        </section>
      )}

      {part.specifications.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-xl font-semibold text-foreground">Specifications</h2>
          <div className="mt-4">
            <SpecificationTable specifications={part.specifications} />
          </div>
        </section>
      )}

      {part.documents.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-xl font-semibold text-foreground">Documents</h2>
          <div className="mt-4">
            <DocumentList documents={part.documents} />
          </div>
        </section>
      )}

      {relatedParts.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-xl font-semibold text-foreground">Parts that fit the same instruments</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedParts.map((related) => (
              <li key={related.id}>
                <ProductCard product={related} basePath="/spare-parts" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </Container>
  );
}
