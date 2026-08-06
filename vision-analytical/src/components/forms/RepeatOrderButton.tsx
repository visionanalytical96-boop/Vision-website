'use client';

import { useRouter } from 'next/navigation';
import { RotateCcw } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { Button } from '@/components/ui/Button';

interface RepeatOrderItem {
  productId: string | null;
  refurbishedInstrumentId: string | null;
  nameSnapshot: string;
  skuSnapshot: string | null;
  quantity: number;
}

export function RepeatOrderButton({ items }: { items: RepeatOrderItem[] }) {
  const { addItem } = useCart();
  const router = useRouter();

  function handleClick() {
    for (const item of items) {
      if (item.productId) {
        addItem(
          { kind: 'PRODUCT', id: item.productId, slug: item.productId, name: item.nameSnapshot, sku: item.skuSnapshot ?? undefined },
          item.quantity,
        );
      } else if (item.refurbishedInstrumentId) {
        addItem(
          { kind: 'REFURBISHED', id: item.refurbishedInstrumentId, slug: item.refurbishedInstrumentId, name: item.nameSnapshot },
          item.quantity,
        );
      }
    }
    router.push('/spare-parts/cart');
  }

  return (
    <Button type="button" variant="outline" onClick={handleClick}>
      <RotateCcw className="h-4 w-4" />
      Repeat Order
    </Button>
  );
}
