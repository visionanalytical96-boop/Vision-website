'use client';

import { useActionState, useState, useTransition } from 'react';
import { ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react';
import {
  beginTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactor,
  type TwoFactorState,
} from '@/lib/actions/two-factor';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

const initialState: TwoFactorState = {};

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-surface-muted"
    >
      {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      {copied ? 'Copied' : label}
    </button>
  );
}

export function TwoFactorSetup({ enabled, enabledAt }: { enabled: boolean; enabledAt: string | null }) {
  const [setup, setSetup] = useState<TwoFactorState | null>(null);
  const [starting, startTransition] = useTransition();

  const [confirmState, confirmAction, confirming] = useActionState(confirmTwoFactorSetup, initialState);
  const [disableState, disableAction, disabling] = useActionState(disableTwoFactor, initialState);

  // Shown exactly once. There is no screen that can print them again, because
  // only their hashes are stored.
  if (confirmState.enabled && confirmState.recoveryCodes) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Two-step verification is on</CardTitle>
          <CardDescription>
            Save these recovery codes now. Each one works once, and this is the only time they are
            shown — if you lose your phone without them, nobody can get you back in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-surface-muted p-4 font-mono text-sm">
            {confirmState.recoveryCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
          <CopyButton value={confirmState.recoveryCodes.join('\n')} label="Copy all codes" />
        </CardContent>
      </Card>
    );
  }

  if (enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Two-step verification <Badge tone="success">On</Badge>
          </CardTitle>
          <CardDescription>
            {enabledAt ? `Turned on ${enabledAt}.` : 'Active.'} Signing in asks for a code from your
            authenticator app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={disableAction} className="flex flex-col gap-3 sm:max-w-sm">
            <FormField
              label="Password"
              htmlFor="disable-password"
              hint="Confirming with your password stops an open session being enough to remove this."
            >
              <Input id="disable-password" name="password" type="password" autoComplete="current-password" />
            </FormField>
            {disableState.error && (
              <p role="alert" className="text-sm text-danger">
                {disableState.error}
              </p>
            )}
            <Button type="submit" variant="danger" disabled={disabling} className="self-start">
              <ShieldOff className="h-4 w-4" aria-hidden />
              {disabling ? 'Turning off…' : 'Turn off two-step verification'}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  const active = setup ?? (confirmState.secret ? confirmState : null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Two-step verification <Badge tone="neutral">Off</Badge>
        </CardTitle>
        <CardDescription>
          Adds a 6-digit code from your phone on top of your password. Works with Google
          Authenticator, Microsoft Authenticator, Authy — any TOTP app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!active ? (
          <Button
            type="button"
            disabled={starting}
            onClick={() =>
              startTransition(async () => {
                setSetup(await beginTwoFactorSetup());
              })
            }
          >
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {starting ? 'Preparing…' : 'Set up two-step verification'}
          </Button>
        ) : (
          <>
            <ol className="space-y-4 text-sm text-foreground">
              <li>
                <p className="font-medium">1. Open your authenticator app and add an account.</p>
                <p className="mt-1 text-muted">
                  Choose &ldquo;Enter a setup key&rdquo; and type the key below. Account name:
                  Vision Analytical.
                </p>
              </li>
              <li>
                <p className="font-medium">2. Enter this key</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="rounded-lg border border-border bg-surface-muted px-3 py-2 font-mono text-sm tracking-wider break-all">
                    {active.secretPretty}
                  </code>
                  {active.secret && <CopyButton value={active.secret} label="Copy key" />}
                </div>
              </li>
              <li>
                <p className="font-medium">3. Type the 6-digit code it shows</p>
              </li>
            </ol>

            <form action={confirmAction} className="flex flex-col gap-3 sm:max-w-xs">
              <FormField label="Code from the app" htmlFor="setup-code" required>
                <Input
                  id="setup-code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className="text-center text-lg tracking-[0.35em]"
                  required
                />
              </FormField>
              {confirmState.error && (
                <p role="alert" className="text-sm text-danger">
                  {confirmState.error}
                </p>
              )}
              <Button type="submit" disabled={confirming} className="self-start">
                {confirming ? 'Checking…' : 'Turn it on'}
              </Button>
            </form>

            <p className="text-xs text-muted">
              Nothing changes about signing in until a correct code is entered here — an abandoned
              setup cannot lock you out.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
