'use client';

import { useActionState, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { login, verifyTwoFactor, type AuthFormState } from '@/lib/actions/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';

const initialState: AuthFormState = {};

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  // Once the password is accepted the server says so and the form swaps to the
  // code step. Held in state as well as read from the result so a failed code
  // does not throw the user back to the password step and make them start over.
  const [showCodeStep, setShowCodeStep] = useState(false);
  if (state.needsTwoFactor && !showCodeStep) setShowCodeStep(true);

  if (showCodeStep) {
    return <TwoFactorStep next={next} />;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}

      <FormField label="Email" htmlFor="email" error={state.errors?.email} required>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </FormField>

      <FormField label="Password" htmlFor="password" error={state.errors?.password} required>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </FormField>

      {state.formError && (
        <p role="alert" className="text-sm text-danger">
          {state.formError}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}

function TwoFactorStep({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(verifyTwoFactor, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}

      <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-muted p-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <p className="text-sm text-muted">
          Open your authenticator app and enter the 6-digit code for Vision Analytical.
        </p>
      </div>

      <FormField
        label="Authentication code"
        htmlFor="code"
        error={state.errors?.code}
        hint="Lost your phone? Enter one of your recovery codes instead."
        required
      >
        <Input
          id="code"
          name="code"
          // Not type="number": that strips leading zeros and shows spinners on
          // a value that is a string of digits, not a quantity.
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="123456"
          className="text-center text-lg tracking-[0.35em]"
          required
        />
      </FormField>

      {state.formError && (
        <p role="alert" className="text-sm text-danger">
          {state.formError}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Checking…' : 'Verify and sign in'}
      </Button>
    </form>
  );
}
