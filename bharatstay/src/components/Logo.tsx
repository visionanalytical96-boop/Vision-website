/**
 * BharatStay's mark: a Sahyadri ridge with a doorway cut into it.
 *
 * The two ideas the business runs on, in one shape — the ghats people travel
 * to, and a place to stay once they get there. Drawn with theme variables so
 * it sits on the light site, the glass theme and the dark admin header without
 * three separate files.
 */
export function Logo({ size = 30, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      role="img"
      aria-label="BharatStay"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <rect width="40" height="40" rx="11" fill="var(--laterite)" />
      {/* far ridge, then the near one — depth without extra detail */}
      <path d="M4 27 L13 15 L20 23 L26 16 L36 27 Z" fill="#ffffff" opacity="0.34" />
      <path d="M4 30 L12 20 L18 26 L25 18 L36 30 Z" fill="#ffffff" opacity="0.9" />
      {/* the doorway */}
      <path d="M17 32 v-5 a3 3 0 0 1 6 0 v5 Z" fill="var(--laterite)" />
      <rect x="4" y="30" width="32" height="2.2" fill="#ffffff" opacity="0.9" />
    </svg>
  );
}

/** Mark plus wordmark — what the header, footer and admin bar all use. */
export function LogoWordmark({
  brandA,
  brandB,
  size = 30,
  text = 21,
}: {
  brandA?: string;
  brandB?: string;
  size?: number;
  text?: number;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Logo size={size} />
      <span className="display" style={{ fontSize: text, lineHeight: 1 }}>
        {brandA}
        <span style={{ color: 'var(--laterite)' }}>{brandB}</span>
      </span>
    </span>
  );
}
