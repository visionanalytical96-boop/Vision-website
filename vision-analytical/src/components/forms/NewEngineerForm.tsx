'use client';

import { useActionState } from 'react';
import { createEngineer, type EngineerFormState } from '@/lib/actions/admin-engineers';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';

const initialState: EngineerFormState = {};

export function NewEngineerForm() {
  const [state, formAction, pending] = useActionState(createEngineer, initialState);

  return (
    <form action={formAction} className="grid max-w-xl gap-4 sm:grid-cols-2">
      <FormField label="Full name" htmlFor="name" error={state.errors?.name} required className="sm:col-span-2">
        <Input id="name" name="name" autoComplete="name" required />
      </FormField>
      <FormField label="Email" htmlFor="email" error={state.errors?.email} required>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </FormField>
      <FormField label="Phone" htmlFor="phone" error={state.errors?.phone}>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" />
      </FormField>
      <FormField
        label="Temporary password"
        htmlFor="password"
        error={state.errors?.password}
        hint="Share this with the engineer so they can sign in."
        required
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </FormField>
      <FormField label="Confirm password" htmlFor="confirmPassword" error={state.errors?.confirmPassword} required>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
      </FormField>

      {state.formError && <p className="text-sm text-danger sm:col-span-2">{state.formError}</p>}

      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? 'Creating…' : 'Add Engineer'}
      </Button>
    </form>
  );
}
