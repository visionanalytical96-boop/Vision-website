'use client';

import { useActionState } from 'react';
import { createRefurbished, updateRefurbished, type RefurbishedFormState } from '@/lib/actions/admin-refurbished';
import { RefurbishedCondition, StockStatus } from '@/generated/prisma/enums';
import type { RefurbishedInstrument, Category } from '@/generated/prisma/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';

const initialState: RefurbishedFormState = {};

interface RefurbishedFormProps {
  categories: Category[];
  instrument?: RefurbishedInstrument;
}

export function RefurbishedForm({ categories, instrument }: RefurbishedFormProps) {
  const action = instrument ? updateRefurbished.bind(null, instrument.id) : createRefurbished;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid max-w-3xl gap-4 sm:grid-cols-2">
      <FormField label="Name" htmlFor="name" error={state.errors?.name} required className="sm:col-span-2">
        <Input id="name" name="name" defaultValue={instrument?.name} required />
      </FormField>

      <FormField label="Slug" htmlFor="slug" error={state.errors?.slug} required>
        <Input id="slug" name="slug" defaultValue={instrument?.slug} required />
      </FormField>
      <FormField label="Category" htmlFor="categoryId" error={state.errors?.categoryId} required>
        <Select id="categoryId" name="categoryId" defaultValue={instrument?.categoryId} required>
          <option value="">Select a category…</option>
          {categories
            .filter((c) => c.kind === 'REFURBISHED')
            .map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
        </Select>
      </FormField>

      <FormField label="Brand" htmlFor="brand" error={state.errors?.brand} required>
        <Input id="brand" name="brand" defaultValue={instrument?.brand} required />
      </FormField>
      <FormField label="Model" htmlFor="model" error={state.errors?.model}>
        <Input id="model" name="model" defaultValue={instrument?.model ?? ''} />
      </FormField>

      <FormField label="Condition" htmlFor="condition" error={state.errors?.condition} required>
        <Select id="condition" name="condition" defaultValue={instrument?.condition ?? RefurbishedCondition.GOOD} required>
          <option value={RefurbishedCondition.EXCELLENT}>Excellent</option>
          <option value={RefurbishedCondition.GOOD}>Good</option>
          <option value={RefurbishedCondition.FAIR}>Fair</option>
        </Select>
      </FormField>
      <FormField label="Warranty (months)" htmlFor="warrantyMonths" error={state.errors?.warrantyMonths} required>
        <Input id="warrantyMonths" name="warrantyMonths" type="number" min="0" defaultValue={instrument?.warrantyMonths ?? 6} required />
      </FormField>

      <FormField label="Included accessories" htmlFor="includedAccessories" error={state.errors?.includedAccessories} hint="Comma-separated" className="sm:col-span-2">
        <Input id="includedAccessories" name="includedAccessories" defaultValue={instrument?.includedAccessories.join(', ') ?? ''} />
      </FormField>

      <FormField label="Demo video URL" htmlFor="demoVideoUrl" error={state.errors?.demoVideoUrl} className="sm:col-span-2">
        <Input id="demoVideoUrl" name="demoVideoUrl" type="url" defaultValue={instrument?.demoVideoUrl ?? ''} />
      </FormField>

      <FormField label="Description" htmlFor="description" error={state.errors?.description} required className="sm:col-span-2">
        <Textarea id="description" name="description" rows={4} defaultValue={instrument?.description} required />
      </FormField>

      <FormField label="Price (₹)" htmlFor="priceRupees" error={state.errors?.priceRupees} hint="Leave blank for 'Contact for pricing'">
        <Input id="priceRupees" name="priceRupees" type="number" min="0" step="0.01" defaultValue={instrument ? (instrument.priceMinor ? instrument.priceMinor / 100 : '') : ''} />
      </FormField>
      <FormField label="Stock status" htmlFor="stockStatus" error={state.errors?.stockStatus} required>
        <Select id="stockStatus" name="stockStatus" defaultValue={instrument?.stockStatus ?? StockStatus.IN_STOCK} required>
          <option value={StockStatus.IN_STOCK}>In stock</option>
          <option value={StockStatus.OUT_OF_STOCK}>Out of stock</option>
        </Select>
      </FormField>

      <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
        <input type="checkbox" name="isPublished" value="true" defaultChecked={instrument?.isPublished ?? true} className="h-4 w-4 rounded border-border" />
        Published (visible on the public site)
      </label>

      {state.formError && <p className="text-sm text-danger sm:col-span-2">{state.formError}</p>}

      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? 'Saving…' : instrument ? 'Save Changes' : 'Add Refurbished Instrument'}
      </Button>
    </form>
  );
}
