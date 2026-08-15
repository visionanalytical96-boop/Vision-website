'use client';

import { useActionState } from 'react';
import { recordStockMovement, type StockMovementFormState } from '@/lib/actions/admin-inventory';
import { StockMovementType } from '@/generated/prisma/enums';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

const initialState: StockMovementFormState = {};

export function StockAdjustForm({ productId }: { productId: string }) {
  const [state, formAction, pending] = useActionState(recordStockMovement, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="productId" value={productId} />
      <Select name="type" defaultValue={StockMovementType.PURCHASE_IN} className="h-8 w-32 text-xs">
        <option value={StockMovementType.PURCHASE_IN}>Purchase in</option>
        <option value={StockMovementType.SALE_OUT}>Sale out</option>
        <option value={StockMovementType.ADJUSTMENT}>Adjustment</option>
        <option value={StockMovementType.RETURN}>Return</option>
      </Select>
      <Input name="quantity" type="number" placeholder="±qty" className="h-8 w-20 text-xs" required />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? '…' : 'Apply'}
      </Button>
      {state.formError && <span className="text-xs text-danger">{state.formError}</span>}
    </form>
  );
}
