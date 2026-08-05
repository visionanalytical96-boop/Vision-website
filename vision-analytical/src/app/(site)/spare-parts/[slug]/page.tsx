import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { ProductImagePlaceholder } from '@/components/product/ProductImagePlaceholder';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AddToCartButton } from '@/components/forms/AddToCartButton';
import { buttonVariants } from '@/components/ui/Button';
import { getSparePartBySlug } from '@/lib/data/spare-parts';
import { stockStatusMeta } from '@/lib/status';
import { formatMinorAmount } from '@/lib/format';
import { whatsappLink } from '@/lib/contact-links';

export async function generateMetadata(props: PageProps<'/spare-parts/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const part = await getSparePartBySlug(slug);
  if (!part) return {};
  return { title: part.seoTitle ?? part.name, description: part.seoDescription ?? part.description };
}

export default async function SparePartDetailPage(props: PageProps<'/spare-parts/[slug]'>) {
  const { slug } = await props.params;
  const part = await getSparePartBySlug(slug);
  if (!part) notFound();

  return (
    <Container className="py-12 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-2">
        <ProductImagePlaceholder className="aspect-square w-full rounded-2xl" />

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

          {part.compatibleBrands.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-foreground">Compatible brands</p>
              <p className="text-sm text-muted">{part.compatibleBrands.join(', ')}</p>
            </div>
          )}

          <p className="mt-6 leading-relaxed text-muted">{part.description}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <AddToCartButton kind="PRODUCT" id={part.id} slug={part.slug} name={part.name} sku={part.sku} />
            <Link href={`/contact?product=${encodeURIComponent(part.name)}`} className={buttonVariants({ variant: 'primary' })}>
              Request Quote
            </Link>
            <a
              href={whatsappLink(`Hi, I'm looking for: ${part.name} (SKU ${part.sku}).`)}
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
    </Container>
  );
}
