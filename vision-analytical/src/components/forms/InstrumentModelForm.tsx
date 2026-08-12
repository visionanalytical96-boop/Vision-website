'use client';

import { useActionState } from 'react';
import {
  createInstrumentModel,
  updateInstrumentModel,
  type InstrumentModelFormState,
} from '@/lib/actions/admin-instrument-models';
import type { Brand, Category, InstrumentModel } from '@/generated/prisma/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';

const initialState: InstrumentModelFormState = {};

export function InstrumentModelForm({
  brands,
  categories,
  model,
}: {
  brands: Brand[];
  categories: Category[];
  model?: InstrumentModel;
}) {
  const action = model ? updateInstrumentModel.bind(null, model.id) : createInstrumentModel;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid max-w-3xl gap-4 sm:grid-cols-2">
      <FormField label="Brand" htmlFor="brandId" error={state.errors?.brandId} required>
        <Select id="brandId" name="brandId" defaultValue={model?.brandId ?? ''} required>
          <option value="">Select a brand…</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Technique" htmlFor="categoryId" error={state.errors?.categoryId}>
        <Select id="categoryId" name="categoryId" defaultValue={model?.categoryId ?? ''}>
          <option value="">Not classified</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Model name" htmlFor="name" error={state.errors?.name} required>
        <Input id="name" name="name" defaultValue={model?.name} placeholder="e.g. Alliance e2695" required />
      </FormField>

      <FormField label="Slug" htmlFor="slug" error={state.errors?.slug} hint="Unique per brand." required>
        <Input id="slug" name="slug" defaultValue={model?.slug} placeholder="alliance-e2695" required />
      </FormField>

      <FormField label="Description" htmlFor="description" error={state.errors?.description} className="sm:col-span-2">
        <Textarea id="description" name="description" rows={2} defaultValue={model?.description ?? ''} />
      </FormField>

      <FormField label="Sort order" htmlFor="sortOrder" error={state.errors?.sortOrder} hint="Lower numbers appear first.">
        <Input id="sortOrder" name="sortOrder" type="number" defaultValue={model?.sortOrder ?? 0} />
      </FormField>

      <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
        <input
          type="checkbox"
          name="isPublished"
          value="true"
          defaultChecked={model?.isPublished ?? true}
          className="h-4 w-4 rounded border-border"
        />
        Published (appears in the parts finder)
      </label>

      {state.formError && <p className="text-sm text-danger sm:col-span-2">{state.formError}</p>}

      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? 'Saving…' : model ? 'Save Changes' : 'Add Model'}
      </Button>
    </form>
  );
}
