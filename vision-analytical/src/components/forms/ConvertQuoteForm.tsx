'use client';

import { useActionState } from 'react';
import { convertQuoteToOrder, type ConvertQuoteFormState } from '@/lib/actions/admin-quotes';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';

const initialState: ConvertQuoteFormState = {};

export function ConvertQuoteForm({ quoteId }: { quoteId: string }) {
  const [state, formAction, pending] = useActionState(convertQuoteToOrder, initialState);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="quoteId" value={quoteId} />
      <FormField label="Address line" htmlFor="line1" error={state.errors?.line1} required className="sm:col-span-2">
        <Input id="line1" name="line1" required />
      </FormField>
      <FormField label="City" htmlFor="city" error={state.errors?.city} required>
        <Input id="city" name="city" required />
      </FormField>
      <FormField label="State" htmlFor="state" error={state.errors?.state} required>
        <Input id="state" name="state" required />
      </FormField>
      <FormField label="Postal code" htmlFor="postalCode" error={state.errors?.postalCode} required>
        <Input id="postalCode" name="postalCode" required />
      </FormField>

      {state.formError && <p className="text-sm text-danger sm:col-span-2">{state.formError}</p>}

      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? 'Converting…' : 'Convert to Order'}
      </Button>
    </form>
  );
}
