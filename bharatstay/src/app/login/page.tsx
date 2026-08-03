import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { LoginPanel } from '@/components/LoginPanel';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Log in' };

export default async function LoginPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ as?: string; next?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const session = await getSession();
  if (session) redirect(session.role === 'ADMIN' ? '/admin' : '/dashboard');

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-16">
      <Link href="/" className="display text-[22px]">
        Bharat<span style={{ color: 'var(--laterite)' }}>Stay</span>
      </Link>
      <div className="mt-8">
        <LoginPanel initialTab={searchParams.as === 'admin' ? 'admin' : 'customer'} next={searchParams.next} />
      </div>
      <Link href="/" className="mt-10 text-[13px]" style={{ color: 'var(--basalt-soft)' }}>
        ← Home
      </Link>
    </main>
  );
}
