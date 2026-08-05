import type { ReactNode } from 'react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-muted px-4 py-12">
      <Link href="/" className="mb-8 font-display text-2xl font-bold tracking-tight text-foreground">
        Vision <span className="text-blue-600 dark:text-cyan-400">Analytical</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
