'use client';

import { useActionState } from 'react';
import { createSupplier, type SupplierFormState } from '@/lib/actions/admin-inventory';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';

const initialState: SupplierFormState = {};

export function SupplierCreateForm() {
  const [state, formAction, pending] = useActionState(createSupplier, initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <FormField label="Supplier name" htmlFor="sup-name" error={state.errors?.name} required>
        <Input id="sup-name" name="name" required />
      </FormField>
      <FormField label="Contact name" htmlFor="sup-contact" error={state.errors?.contactName}>
        <Input id="sup-contact" name="contactName" />
      </FormField>
      <FormField label="Email" htmlFor="sup-email" error={state.errors?.email}>
        <Input id="sup-email" name="email" type="email" />
      </FormField>
      <FormField label="Phone" htmlFor="sup-phone" error={state.errors?.phone}>
        <Input id="sup-phone" name="phone" type="tel" />
      </FormField>
      <FormField label="Address" htmlFor="sup-address" error={state.errors?.address} className="sm:col-span-2">
        <Input id="sup-address" name="address" />
      </FormField>

      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? 'Adding…' : 'Add Supplier'}
      </Button>
    </form>
  );
}
