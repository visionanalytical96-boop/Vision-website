'use client';

import { useActionState } from 'react';
import { resetPassword, type ResetPasswordState } from '@/lib/actions/password-reset';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';

const initialState: ResetPasswordState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <FormField
        label="New password"
        htmlFor="password"
        error={state.errors?.password}
        hint="At least 8 characters."
        required
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          autoFocus
          required
        />
      </FormField>

      <FormField
        label="Confirm new password"
        htmlFor="confirmPassword"
        error={state.errors?.confirmPassword}
        required
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save new password'}
      </Button>
    </form>
  );
}
