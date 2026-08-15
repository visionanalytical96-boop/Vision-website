import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ForgotPasswordForm } from '@/components/forms/ForgotPasswordForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';

export const metadata: Metadata = { title: 'Forgot Password' };

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Forgot your password?</CardTitle>
        <CardDescription>
          Enter the email you sign in with and we&rsquo;ll send you a link to choose a new password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
        <p className="mt-6 text-center text-sm text-muted">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline dark:text-secondary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
