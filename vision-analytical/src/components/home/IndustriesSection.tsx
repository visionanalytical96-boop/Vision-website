import { Container } from '@/components/ui/Container';
import { SectionHeading } from './SectionHeading';
import { resolveIcon } from '@/lib/cms/icons';
import type { IndustriesContent } from '@/lib/cms/schemas';

export function IndustriesSection({ content }: { content: IndustriesContent }) {
  if (content.industries.length === 0) return null;

  return (
    <section className="bg-surface-muted py-16 sm:py-20">
      <Container>
        <SectionHeading heading={content.heading} subheading={content.subheading} />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {content.industries.map((industry) => {
            const Icon = resolveIcon(industry.iconKey);
            return (
              <li key={industry.name} className="rounded-xl border border-border bg-surface p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-light dark:bg-white/5">
                  <Icon className="h-5 w-5 text-primary dark:text-secondary" />
                </div>
                <p className="mt-4 font-display text-lg font-semibold text-foreground">{industry.name}</p>
                {industry.description ? <p className="mt-2 text-sm text-muted">{industry.description}</p> : null}
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
