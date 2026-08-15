import Link from 'next/link';

/**
 * The heading block every homepage section shares: title, optional standfirst,
 * and an optional "see everything" link that drops below the title on mobile.
 */
export function SectionHeading({
  heading,
  subheading,
  linkLabel,
  linkHref,
}: {
  heading: string;
  subheading?: string;
  linkLabel?: string;
  linkHref?: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
      <div className="max-w-2xl">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{heading}</h2>
        {subheading ? <p className="mt-2 text-muted">{subheading}</p> : null}
      </div>
      {linkLabel && linkHref ? (
        <Link
          href={linkHref}
          className="flex-none text-sm font-medium text-primary hover:underline dark:text-secondary"
        >
          {linkLabel} →
        </Link>
      ) : null}
    </div>
  );
}
