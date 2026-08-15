import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components/forms/LoginForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';

export const metadata: Metadata = { title: 'Login' };

export default async function LoginPage(props: PageProps<'/login'>) {
  const searchParams = await props.searchParams;
  const nextParam = typeof searchParams.next === 'string' ? searchParams.next : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Access your orders, quotes, AMC contracts and service history.</CardDescription>
      </CardHeader>
      <CardContent>
        {searchParams.reset === 'done' && (
          <p
            role="status"
            className="mb-4 rounded-lg bg-success-bg px-3 py-2 text-sm text-success"
          >
            Your password has been changed. Sign in with the new one.
          </p>
        )}

        <LoginForm next={nextParam} />

        <p className="mt-4 text-center text-sm">
          <Link
            href="/forgot-password"
            className="font-medium text-primary hover:underline dark:text-secondary"
          >
            Forgot your password?
          </Link>
        </p>

        <p className="mt-4 text-center text-sm text-muted">
          New customer?{' '}
          <Link href="/register" className="font-medium text-primary hover:underline dark:text-secondary">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
