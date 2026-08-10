import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { buttonVariants } from '@/components/ui/Button';
import { getPageContent } from '@/lib/data/cms';
import { servicesContentSchema, parseContent } from '@/lib/cms/schemas';
import { DEFAULT_SERVICES_CONTENT } from '@/lib/cms/defaults';
import { resolveIcon } from '@/lib/cms/icons';
import { ContentPageKey } from '@/generated/prisma/enums';

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Installation, preventive maintenance, breakdown support, AMC/CMC, calibration, IQ/OQ/PQ and validation for analytical instruments.',
};

export default async function ServicesPage() {
  const page = await getPageContent(ContentPageKey.SERVICES);
  const content = parseContent(servicesContentSchema, page?.content, DEFAULT_SERVICES_CONTENT);

  return (
    <>
      <section className="border-b border-border bg-surface-muted py-16 sm:py-20">
        <Container>
          <p className="font-mono text-sm tracking-wide text-blue-600 dark:text-cyan-400">{content.eyebrow}</p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-bold text-foreground sm:text-4xl">{content.heading}</h1>
          <p className="mt-4 max-w-2xl text-muted">
            {content.subheading} Already a customer with an urgent issue?{' '}
            <Link href="/login?next=/portal/service-requests/new" className="text-blue-600 hover:underline dark:text-cyan-400">
              Log in to raise a service request
            </Link>
            .
          </p>
        </Container>
      </section>

      {content.groups.map((group) => (
        <section key={group.id} id={group.id} className="py-16 sm:py-20">
          <Container>
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{group.title}</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.services.map((service) => {
                const Icon = resolveIcon(service.iconKey);
                return (
                  <div key={service.name} className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                    <Icon className="h-6 w-6 text-blue-600 dark:text-cyan-400" />
                    <p className="mt-3 font-display text-lg font-semibold text-foreground">{service.name}</p>
                    <p className="mt-2 text-sm text-muted">{service.description}</p>
                  </div>
                );
              })}
            </div>
          </Container>
        </section>
      ))}

      <section className="bg-slate-950 py-16 text-white sm:py-20">
        <Container className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">{content.ctaHeading}</h2>
            <p className="mt-2 text-slate-300">{content.ctaSubheading}</p>
          </div>
          <Link href="/contact" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
            {content.ctaButtonLabel}
          </Link>
        </Container>
      </section>
    </>
  );
}
