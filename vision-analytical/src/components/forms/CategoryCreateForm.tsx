'use client';

import { useActionState } from 'react';
import { createCategory, type CategoryFormState } from '@/lib/actions/admin-categories';
import { CategoryKind } from '@/generated/prisma/enums';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';

const initialState: CategoryFormState = {};

export function CategoryCreateForm() {
  const [state, formAction, pending] = useActionState(createCategory, initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <FormField label="Name" htmlFor="cat-name" error={state.errors?.name} required>
        <Input id="cat-name" name="name" required />
      </FormField>
      <FormField label="Slug" htmlFor="cat-slug" error={state.errors?.slug} required>
        <Input id="cat-slug" name="slug" required />
      </FormField>
      <FormField label="Type" htmlFor="cat-kind" error={state.errors?.kind} required>
        <Select id="cat-kind" name="kind" defaultValue={CategoryKind.INSTRUMENT} required>
          <option value={CategoryKind.INSTRUMENT}>Instrument</option>
          <option value={CategoryKind.SPARE_PART}>Spare Part</option>
          <option value={CategoryKind.REFURBISHED}>Refurbished</option>
        </Select>
      </FormField>
      <FormField label="Sort order" htmlFor="cat-sort" error={state.errors?.sortOrder}>
        <Input id="cat-sort" name="sortOrder" type="number" defaultValue={0} />
      </FormField>
      <FormField label="Description" htmlFor="cat-description" error={state.errors?.description} className="sm:col-span-2">
        <Input id="cat-description" name="description" />
      </FormField>

      {state.formError && <p className="text-sm text-danger sm:col-span-2">{state.formError}</p>}

      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? 'Adding…' : 'Add Category'}
      </Button>
    </form>
  );
}
