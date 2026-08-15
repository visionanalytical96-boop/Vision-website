'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/cart-context';

export function CartIndicator() {
  const { count } = useCart();

  return (
    <Link
      href="/spare-parts/cart"
      aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
      className="relative flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-surface-muted"
    >
      <ShoppingCart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
