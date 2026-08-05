'use client';

import { useActionState } from 'react';
import { registerCustomer, type AuthFormState } from '@/lib/actions/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';

const initialState: AuthFormState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerCustomer, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField label="Full name" htmlFor="name" error={state.errors?.name} required>
        <Input id="name" name="name" autoComplete="name" required />
      </FormField>

      <FormField label="Company name" htmlFor="companyName" error={state.errors?.companyName}>
        <Input id="companyName" name="companyName" autoComplete="organization" />
      </FormField>

      <FormField label="Email" htmlFor="email" error={state.errors?.email} required>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </FormField>

      <FormField label="Phone" htmlFor="phone" error={state.errors?.phone}>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" />
      </FormField>

      <FormField label="Password" htmlFor="password" error={state.errors?.password} required>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </FormField>

      <FormField label="Confirm password" htmlFor="confirmPassword" error={state.errors?.confirmPassword} required>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
      </FormField>

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
