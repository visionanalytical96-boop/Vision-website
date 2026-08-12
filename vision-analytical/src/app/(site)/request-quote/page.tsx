import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, ShieldCheck, Wrench } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { RequestQuoteForm } from '@/components/forms/RequestQuoteForm';
import { getCurrentUser } from '@/lib/dal';
import { getPublishedProductBySlug } from '@/lib/data/products';
import { getBrandHubBySlug } from '@/lib/data/brands';

export const metadata: Metadata = {
  title: 'Request a Quote',
  description:
    'Tell us which instrument, spare part or service plan you need and we will come back with pricing and lead times — usually the same day.',
};

const ASSURANCES = [
  { icon: Clock, title: 'Same-day response', body: 'Most quotes go out the same working day, across Maharashtra & Gujarat.' },
  { icon: Wrench, title: 'Multi-brand', body: 'Shimadzu, Waters, Agilent, Thermo and more — including parts we source to order.' },
  { icon: ShieldCheck, title: 'No obligation', body: 'A quote is just a quote. No payment details, no commitment.' },
];

export default async function RequestQuotePage(props: PageProps<'/request-quote'>) {
  const searchParams = await props.searchParams;
  const productSlug = typeof searchParams.product === 'string' ? searchParams.product : undefined;
  const brandSlug = typeof searchParams.brand === 'string' ? searchParams.brand : undefined;

  // Deep links from a product page or a brand hub pre-fill the first line, so
  // the visitor doesn't retype what they were already looking at.
  const [user, product, brandHub] = await Promise.all([
    getCurrentUser(),
    productSlug ? getPublishedProductBySlug(productSlug) : null,
    brandSlug ? getBrandHubBySlug(brandSlug) : null,
  ]);

  const defaultRequirement = product
    ? `${product.name}${product.sku ? ` (${product.sku})` : ''}`
    : brandHub
      ? `${brandHub.brand.name} — `
      : '';

  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Request a quote</h1>
        <p className="mt-3 text-muted">
          Tell us what you need and we&apos;ll come back with pricing, availability and lead times. Already have items in
          your cart?{' '}
          <Link href="/spare-parts/cart" className="text-primary hover:underline dark:text-secondary">
            Submit those instead
          </Link>
          .
        </p>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:gap-16">
        <RequestQuoteForm
          defaultName={user?.name}
          defaultEmail={user?.email}
          defaultPhone={user?.phone ?? undefined}
          defaultRequirement={defaultRequirement}
        />

        <aside className="lg:pt-2">
          <ul className="space-y-4">
            {ASSURANCES.map((assurance) => {
              const Icon = assurance.icon;
              return (
                <li key={assurance.title} className="rounded-xl border border-border bg-surface p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light dark:bg-white/5">
                    <Icon className="h-5 w-5 text-primary dark:text-secondary" aria-hidden />
                  </div>
                  <p className="mt-3 font-display font-semibold text-foreground">{assurance.title}</p>
                  <p className="mt-1 text-sm text-muted">{assurance.body}</p>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </Container>
  );
}
