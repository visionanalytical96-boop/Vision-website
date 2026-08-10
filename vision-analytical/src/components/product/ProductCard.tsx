import Link from 'next/link';
import type { Product } from '@/generated/prisma/client';
import { ProductImage } from './ProductImage';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { stockStatusMeta } from '@/lib/status';
import { formatMinorAmount } from '@/lib/format';
import { toImageList } from '@/lib/image-list';

export function ProductCard({ product, basePath }: { product: Product; basePath: string }) {
  return (
    <Link
      href={`${basePath}/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-colors hover:border-primary"
    >
      <ProductImage images={toImageList(product.images)} alt={product.name} className="h-40 w-full" sizes="(min-width: 1024px) 25vw, 50vw" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-display font-semibold text-foreground">{product.name}</p>
          <StatusBadge meta={stockStatusMeta[product.stockStatus]} />
        </div>
        {product.brand && <p className="text-xs text-muted">{product.brand}</p>}
        <p className="mt-auto text-sm font-medium text-foreground">
          {product.priceMinor ? formatMinorAmount(product.priceMinor) : 'Contact for pricing'}
        </p>
      </div>
    </Link>
  );
}
