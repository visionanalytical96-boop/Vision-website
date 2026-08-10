import type { Metadata } from 'next';
import Link from 'next/link';
import { RegisterForm } from '@/components/forms/RegisterForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';

export const metadata: Metadata = { title: 'Create account' };

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Request quotes, track orders and manage AMC contracts online.</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline dark:text-secondary">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
