import Link from 'next/link';
import type { Brand, Category, InstrumentModel, KnowledgeArticleLink, Product } from '@/generated/prisma/client';
import { ProductKind } from '@/generated/prisma/enums';

export type ArticleLinkRow = KnowledgeArticleLink & {
  brand: Brand | null;
  instrumentModel: (InstrumentModel & { brand: Brand }) | null;
  product: (Product & { category: Category }) | null;
};

function productHref(product: Product & { category: Category }): string {
  return product.kind === ProductKind.SPARE_PART
    ? `/spare-parts/${product.slug}`
    : `/products/${product.category.slug}/${product.slug}`;
}

/**
 * What an article is about, as links back into the catalogue. Reading a
 * troubleshooting note and then having to search for the part it names is the
 * gap this closes.
 */
export function ArticleLinks({ links }: { links: ArticleLinkRow[] }) {
  const entries: { key: string; label: string; href: string }[] = [];

  for (const link of links) {
    if (link.instrumentModel) {
      entries.push({
        key: `model-${link.id}`,
        label: `${link.instrumentModel.brand.name} ${link.instrumentModel.name}`,
        href: `/spare-parts?brand=${link.instrumentModel.brand.slug}&model=${link.instrumentModel.slug}`,
      });
    } else if (link.brand) {
      entries.push({ key: `brand-${link.id}`, label: link.brand.name, href: `/brands/${link.brand.slug}` });
    }
    if (link.product) {
      entries.push({ key: `product-${link.id}`, label: link.product.name, href: productHref(link.product) });
    }
  }

  if (entries.length === 0) return null;

  return (
    <div className="mt-8 rounded-xl border border-border bg-surface-muted p-5">
      <p className="text-sm font-semibold text-foreground">This applies to</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {entries.map((entry) => (
          <li key={entry.key}>
            <Link
              href={entry.href}
              className="inline-flex rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary"
            >
              {entry.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
