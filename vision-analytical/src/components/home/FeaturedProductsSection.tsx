import { Container } from '@/components/ui/Container';
import { ProductCard } from '@/components/product/ProductCard';
import { SectionHeading } from './SectionHeading';
import { ProductKind } from '@/generated/prisma/enums';
import type { Brand, Category, Product } from '@/generated/prisma/client';
import type { FeaturedProductsContent } from '@/lib/cms/schemas';

type FeaturedProduct = Product & { brand: Brand | null; category: Category };

/** Spare parts and instruments live under different URL prefixes. */
function basePathFor(product: FeaturedProduct): string {
  return product.kind === ProductKind.SPARE_PART ? '/spare-parts' : `/products/${product.category.slug}`;
}

export function FeaturedProductsSection({
  content,
  products,
}: {
  content: FeaturedProductsContent;
  products: FeaturedProduct[];
}) {
  if (products.length === 0) return null;

  return (
    <section className="bg-surface-muted py-16 sm:py-20">
      <Container>
        <SectionHeading
          heading={content.heading}
          subheading={content.subheading}
          linkLabel={content.viewAllLabel}
          linkHref={content.viewAllHref}
        />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} basePath={basePathFor(product)} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
