import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { MessageCircle, PlayCircle, ShieldCheck } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { ProductImage } from '@/components/product/ProductImage';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AddToCartButton } from '@/components/forms/AddToCartButton';
import { buttonVariants } from '@/components/ui/Button';
import { JsonLd } from '@/components/seo/JsonLd';
import { getRefurbishedInstrumentBySlug } from '@/lib/data/refurbished';
import { getSiteSettings } from '@/lib/data/cms';
import { refurbishedConditionMeta } from '@/lib/status';
import { formatMinorAmount } from '@/lib/format';
import { whatsappLink } from '@/lib/contact-links';
import { toImageList } from '@/lib/image-list';
import { buildProductSchema } from '@/lib/seo/product-schema';
import { StockStatus } from '@/generated/prisma/enums';

export async function generateMetadata(props: PageProps<'/refurbished/[category]/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const instrument = await getRefurbishedInstrumentBySlug(slug);
  if (!instrument) return {};
  return { title: instrument.name, description: instrument.description };
}

export default async function RefurbishedDetailPage(props: PageProps<'/refurbished/[category]/[slug]'>) {
  const { category: categorySlug, slug } = await props.params;
  const [instrument, settings] = await Promise.all([getRefurbishedInstrumentBySlug(slug), getSiteSettings()]);
  if (!instrument) notFound();
  if (instrument.category.slug !== categorySlug) {
    redirect(`/refurbished/${instrument.category.slug}/${instrument.slug}`);
  }

  const schema = buildProductSchema({
    name: instrument.name,
    description: instrument.description,
    path: `/refurbished/${categorySlug}/${instrument.slug}`,
    images: toImageList(instrument.images),
    priceMinor: instrument.priceMinor,
    inStock: instrument.stockStatus !== StockStatus.OUT_OF_STOCK,
    brand: instrument.brand.name,
    refurbished: true,
  });

  return (
    <Container className="py-12 sm:py-16">
      <JsonLd data={schema} />
      <div className="grid gap-10 lg:grid-cols-2">
        <ProductImage images={toImageList(instrument.images)} alt={instrument.name} className="aspect-square w-full rounded-2xl" />

        <div>
          <p className="text-sm text-muted">
            <Link href={`/refurbished/${categorySlug}`} className="hover:text-foreground">
              Refurbished {instrument.category.name}
            </Link>
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-foreground">{instrument.name}</h1>
          <p className="mt-1 text-muted">
            {instrument.brand.name}
            {instrument.model ? ` · ${instrument.model}` : ''}
          </p>

          <div className="mt-4 flex items-center gap-3">
            <StatusBadge meta={refurbishedConditionMeta[instrument.condition]} />
            <span className="font-medium text-foreground">
              {instrument.priceMinor ? formatMinorAmount(instrument.priceMinor) : 'Contact for pricing'}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-muted">
            <ShieldCheck className="h-4 w-4 text-primary dark:text-secondary" />
            {instrument.warrantyMonths}-month warranty included
          </div>

          <p className="mt-6 leading-relaxed text-muted">{instrument.description}</p>

          {instrument.includedAccessories.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-foreground">Included accessories</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted">
                {instrument.includedAccessories.map((accessory) => (
                  <li key={accessory}>{accessory}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex items-center gap-2 text-sm text-muted">
            <PlayCircle className="h-4 w-4" />
            {instrument.demoVideoUrl ? (
              <a href={instrument.demoVideoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline dark:text-secondary">
                Watch demo video
              </a>
            ) : (
              'Demo video available on request'
            )}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <AddToCartButton kind="REFURBISHED" id={instrument.id} slug={instrument.slug} name={instrument.name} />
            <Link href={`/contact?product=${encodeURIComponent(instrument.name)}`} className={buttonVariants({ variant: 'primary' })}>
              Request Quote
            </Link>
            <a
              href={whatsappLink(settings?.whatsappNumber, `Hi, I'm interested in the refurbished ${instrument.name}.`)}
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
