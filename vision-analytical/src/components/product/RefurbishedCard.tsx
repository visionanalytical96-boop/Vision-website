import Link from 'next/link';
import type { RefurbishedInstrument } from '@/generated/prisma/client';
import { ProductImage } from './ProductImage';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { refurbishedConditionMeta } from '@/lib/status';
import { formatMinorAmount } from '@/lib/format';
import { toImageList } from '@/lib/image-list';

export function RefurbishedCard({ instrument, basePath }: { instrument: RefurbishedInstrument; basePath: string }) {
  return (
    <Link
      href={`${basePath}/${instrument.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-colors hover:border-blue-500"
    >
      <ProductImage images={toImageList(instrument.images)} alt={instrument.name} className="h-40 w-full" sizes="(min-width: 1024px) 25vw, 50vw" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-display font-semibold text-foreground">{instrument.name}</p>
          <StatusBadge meta={refurbishedConditionMeta[instrument.condition]} />
        </div>
        <p className="text-xs text-muted">{instrument.warrantyMonths}-month warranty</p>
        <p className="mt-auto text-sm font-medium text-foreground">
          {instrument.priceMinor ? formatMinorAmount(instrument.priceMinor) : 'Contact for pricing'}
        </p>
      </div>
    </Link>
  );
}
