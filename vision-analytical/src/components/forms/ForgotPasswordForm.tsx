'use client';

import { useActionState } from 'react';
import { MailCheck } from 'lucide-react';
import { requestPasswordReset, type ResetRequestState } from '@/lib/actions/password-reset';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';

const initialState: ResetRequestState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  if (state.sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <MailCheck className="h-10 w-10 text-primary dark:text-secondary" aria-hidden />
        <p className="font-medium text-foreground">Check your email</p>
        {/* Deliberately not "we found your account" — saying whether an address
            is registered turns this form into a way to find that out. */}
        <p className="text-sm text-muted">
          If that address has an account, a link to choose a new password is on its way. It works
          once and expires in 30 minutes.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField label="Email" htmlFor="email" error={state.errors?.email} required>
        <Input id="email" name="email" type="email" autoComplete="email" autoFocus required />
      </FormField>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Sending…' : 'Send reset link'}
      </Button>
    </form>
  );
}
