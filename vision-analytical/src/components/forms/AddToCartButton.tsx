'use client';

import { useState } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import { useCart, type CartItemKind } from '@/lib/cart-context';
import { Button } from '@/components/ui/Button';

interface AddToCartButtonProps {
  kind: CartItemKind;
  id: string;
  slug: string;
  name: string;
  sku?: string;
}

export function AddToCartButton({ kind, id, slug, name, sku }: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleClick() {
    addItem({ kind, id, slug, name, sku });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <Button type="button" variant="outline" onClick={handleClick}>
      {added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
      {added ? 'Added' : 'Add to Cart'}
    </Button>
  );
}
