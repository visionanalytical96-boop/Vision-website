import Link from 'next/link';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`group flex items-center gap-2 ${className}`}>
      <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-royal-700 text-saffron-400">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
          <path
            d="M12 2C8.7 2 6 4.7 6 8c0 4.5 6 12 6 12s6-7.5 6-12c0-3.3-2.7-6-6-6Z"
            fill="currentColor"
            opacity="0.9"
          />
          <path d="M9 9.5 12 7l3 2.5v3.2L12 15l-3-2.3V9.5Z" fill="#16265a" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-lg font-extrabold tracking-tight text-royal-800">
          Bharat<span className="text-saffron-500">Stay</span>
        </span>
        <span className="hidden text-[10px] font-medium uppercase tracking-widest text-royal-400 sm:block">
          Explore India, Stay Your Way
        </span>
      </span>
    </Link>
  );
}
