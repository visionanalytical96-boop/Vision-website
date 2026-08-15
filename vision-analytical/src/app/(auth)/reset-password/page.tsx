import type { Metadata } from 'next';
import Link from 'next/link';
import { checkResetToken } from '@/lib/actions/password-reset';
import { ResetPasswordForm } from '@/components/forms/ResetPasswordForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { buttonVariants } from '@/components/ui/Button';

export const metadata: Metadata = { title: 'Choose a New Password' };

const PROBLEMS = {
  unknown: 'That link is not valid. It may have been mistyped or already replaced by a newer one.',
  expired: 'That link has expired. Reset links last 30 minutes.',
  used: 'That link has already been used. Each link works once.',
} as const;

export default async function ResetPasswordPage({
  searchParams,
}: {
  // Written out rather than PageProps<'/reset-password'>: that generated type
  // only exists once the route has been through a build, so a fresh checkout
  // fails to typecheck before it has ever been built.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === 'string' ? params.token : '';

  // Checked before the form renders, so a stale link says so straight away
  // rather than after someone has typed a new password twice.
  const state = await checkResetToken(token);

  if (state !== 'valid') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>This link no longer works</CardTitle>
          <CardDescription>{PROBLEMS[state]}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Link href="/forgot-password" className={buttonVariants()}>
            Send a new link
          </Link>
          <Link
            href="/login"
            className="text-center text-sm font-medium text-primary hover:underline dark:text-secondary"
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>Pick something you don&rsquo;t use anywhere else.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm token={token} />
      </CardContent>
    </Card>
  );
}
