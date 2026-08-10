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
        <LoginForm next={nextParam} />
        <p className="mt-6 text-center text-sm text-muted">
          New customer?{' '}
          <Link href="/register" className="font-medium text-primary hover:underline dark:text-secondary">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
