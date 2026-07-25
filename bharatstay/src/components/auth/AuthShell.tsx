import Link from 'next/link';
import { Logo } from '@/components/layout/Logo';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-royal-900 via-royal-800 to-royal-700 p-10 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden>
          <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-saffron-500 blur-3xl" />
          <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-success-500 blur-3xl" />
        </div>
        <Logo className="relative [&_span]:text-white" />
        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight">
            India&rsquo;s Complete
            <br /> Travel Booking Platform
          </h2>
          <p className="mt-3 max-w-sm text-royal-100">
            Hotels, flights, buses, cabs and holiday packages — book, manage and travel with confidence.
          </p>
        </div>
        <p className="relative text-xs text-royal-300">© {new Date().getFullYear()} BharatStay Travels Pvt. Ltd.</p>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mb-8 lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-2xl font-bold text-royal-900">{title}</h1>
          <p className="mt-1 text-sm text-royal-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
          <div className="mt-6 text-center text-sm text-royal-500">{footer}</div>
          <Link href="/" className="mt-6 block text-center text-xs text-royal-400 hover:text-royal-600">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
