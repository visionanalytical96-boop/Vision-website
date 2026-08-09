import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { ProductImage } from '@/components/product/ProductImage';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AddToCartButton } from '@/components/forms/AddToCartButton';
import { buttonVariants } from '@/components/ui/Button';
import { getPublishedProductBySlug } from '@/lib/data/products';
import { stockStatusMeta } from '@/lib/status';
import { formatMinorAmount } from '@/lib/format';
import { whatsappLink } from '@/lib/contact-links';
import { toImageList } from '@/lib/image-list';

export async function generateMetadata(props: PageProps<'/products/[category]/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getPublishedProductBySlug(slug);
  if (!product) return {};
  return { title: product.seoTitle ?? product.name, description: product.seoDescription ?? product.description };
}

export default async function ProductDetailPage(props: PageProps<'/products/[category]/[slug]'>) {
  const { category: categorySlug, slug } = await props.params;
  const product = await getPublishedProductBySlug(slug);
  if (!product) notFound();
  if (product.category.slug !== categorySlug) {
    redirect(`/products/${product.category.slug}/${product.slug}`);
  }

  return (
    <Container className="py-12 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-2">
        <ProductImage images={toImageList(product.images)} alt={product.name} className="aspect-square w-full rounded-2xl" />

        <div>
          <p className="text-sm text-muted">
            <Link href={`/products/${categorySlug}`} className="hover:text-foreground">
              {product.category.name}
            </Link>
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-foreground">{product.name}</h1>
          {product.brand && <p className="mt-1 text-muted">{product.brand}</p>}

          <div className="mt-4 flex items-center gap-3">
            <StatusBadge meta={stockStatusMeta[product.stockStatus]} />
            <span className="font-medium text-foreground">
              {product.priceMinor ? formatMinorAmount(product.priceMinor) : 'Contact for pricing'}
            </span>
          </div>

          {product.compatibleBrands.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-foreground">Compatible brands</p>
              <p className="text-sm text-muted">{product.compatibleBrands.join(', ')}</p>
            </div>
          )}

          <p className="mt-6 leading-relaxed text-muted">{product.description}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/contact?product=${encodeURIComponent(product.name)}`} className={buttonVariants({ variant: 'primary' })}>
              Request Quote
            </Link>
            <AddToCartButton kind="PRODUCT" id={product.id} slug={product.slug} name={product.name} sku={product.sku} />
            <a
              href={whatsappLink(`Hi, I'm interested in the ${product.name}.`)}
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
