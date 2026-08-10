import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { getPageContent } from '@/lib/data/cms';
import { aboutContentSchema, parseContent } from '@/lib/cms/schemas';
import { DEFAULT_ABOUT_CONTENT } from '@/lib/cms/defaults';
import { resolveIcon } from '@/lib/cms/icons';
import { ContentPageKey } from '@/generated/prisma/enums';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    "Vision Analytical is Maharashtra & Gujarat's laboratory instrument partner - sales, service, AMC and IQ/OQ/PQ qualification since 2016.",
};

export default async function AboutPage() {
  const page = await getPageContent(ContentPageKey.ABOUT);
  const content = parseContent(aboutContentSchema, page?.content, DEFAULT_ABOUT_CONTENT);

  return (
    <>
      <section className="border-b border-border bg-surface-muted py-16 sm:py-20">
        <Container>
          <p className="font-mono text-sm tracking-wide text-blue-600 dark:text-cyan-400">{content.eyebrow}</p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            {content.heading}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted">{content.subheading}</p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-6">
            {content.facts.map((fact) => {
              const Icon = resolveIcon(fact.iconKey);
              return (
                <div key={fact.label} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
                  <Icon className="h-5 w-5 shrink-0 text-blue-600 dark:text-cyan-400" />
                  <div>
                    <p className="text-xs text-muted">{fact.label}</p>
                    <p className="font-medium text-foreground">{fact.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{content.brandsHeading}</h2>
          <p className="mt-2 max-w-2xl text-muted">{content.brandsSubheading}</p>
          <div className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            {content.brands.map((brand) => (
              <span key={brand} className="font-display text-xl font-semibold text-foreground">
                {brand}
              </span>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-surface-muted py-16 sm:py-20">
        <Container>
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{content.industriesHeading}</h2>
          <p className="mt-2 max-w-2xl text-muted">{content.industriesSubheading}</p>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {content.industries.map((industry) => {
              const Icon = resolveIcon(industry.iconKey);
              return (
                <div key={industry.name} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
                  <Icon className="h-5 w-5 shrink-0 text-blue-600 dark:text-cyan-400" />
                  <span className="text-sm font-medium text-foreground">{industry.name}</span>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{content.whyUsHeading}</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {content.whyUs.map((item) => {
              const Icon = resolveIcon(item.iconKey);
              return (
                <div key={item.title} className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-white/5">
                    <Icon className="h-5 w-5 text-blue-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <p className="font-display text-lg font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 text-sm text-muted">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Container>
      </section>
    </>
  );
}
