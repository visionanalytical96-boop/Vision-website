import Image from 'next/image';

interface SiteWordmarkProps {
  companyName: string;
  logoUrl?: string | null;
  className?: string;
}

// Splits on the first space so the default "Vision Analytical" keeps its
// existing two-tone styling; a single-word company name just renders plain.
export function SiteWordmark({ companyName, logoUrl, className }: SiteWordmarkProps) {
  if (logoUrl) {
    return (
      <span className={`relative block h-8 w-40 ${className ?? ''}`}>
        <Image src={logoUrl} alt={companyName} fill className="object-contain object-left" sizes="160px" />
      </span>
    );
  }

  const spaceIndex = companyName.indexOf(' ');
  if (spaceIndex === -1) {
    return <span className={className}>{companyName}</span>;
  }

  // The second word carries a slow highlight sweep (see .va-sheen). It is
  // switched off by the Theme Settings animations toggle and by reduced-motion,
  // and both cases hand the text colour back — the gradient clip is what
  // colours it, so without that fallback the word would vanish.
  return (
    <span className={className}>
      {companyName.slice(0, spaceIndex)}{' '}
      <span className="va-sheen text-primary dark:text-secondary">{companyName.slice(spaceIndex + 1)}</span>
    </span>
  );
}
