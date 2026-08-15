import Link from 'next/link';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { buttonVariants } from '@/components/ui/Button';
import type { OverviewContent } from '@/lib/cms/schemas';

export function CompanyOverviewSection({ content }: { content: OverviewContent }) {
  return (
    <section className="py-16 sm:py-20">
      <Container className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-primary dark:text-secondary">{content.eyebrow}</p>
          <h2 className="mt-3 max-w-[20ch] font-display text-2xl font-bold tracking-tight text-foreground text-balance sm:text-3xl">
            {content.heading}
          </h2>
          <div className="mt-5 space-y-4 text-muted">
            {content.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          {content.buttonLabel ? (
            <Link href={content.buttonHref} className={buttonVariants({ variant: 'outline', className: 'mt-7' })}>
              {content.buttonLabel}
            </Link>
          ) : null}
        </div>

        <div className="flex flex-col gap-8">
          {content.image ? (
            <div className="relative aspect-4/3 overflow-hidden rounded-xl border border-border bg-surface-muted">
              <Image src={content.image} alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            </div>
          ) : null}
          {content.stats.length > 0 ? (
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
              {content.stats.map((stat) => (
                <div key={stat.label} className="bg-surface p-5">
                  <dt className="text-xs uppercase tracking-[0.08em] text-muted">{stat.label}</dt>
                  <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">{stat.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
