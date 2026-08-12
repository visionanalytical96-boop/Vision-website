import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { MessageCircle, Phone, FlaskConical } from 'lucide-react';
import { buttonVariants } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { JsonLd } from '@/components/seo/JsonLd';
import { whatsappLink, telLink } from '@/lib/contact-links';
import { getHomeSections, getSiteSettings } from '@/lib/data/cms';
import { getInstrumentCategories } from '@/lib/data/products';
import { resolveIcon } from '@/lib/cms/icons';
import {
  heroContentSchema,
  categoriesContentSchema,
  cardsContentSchema,
  ctaContentSchema,
  parseContent,
} from '@/lib/cms/schemas';
import {
  DEFAULT_HERO_CONTENT,
  DEFAULT_CATEGORIES_CONTENT,
  DEFAULT_LIFECYCLE_CONTENT,
  DEFAULT_WHY_US_CONTENT,
  DEFAULT_CTA_CONTENT,
} from '@/lib/cms/defaults';
import { HomeSectionKey } from '@/generated/prisma/enums';

export const metadata: Metadata = {
  title: 'Home',
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default async function HomePage() {
  const [sections, categories, settings] = await Promise.all([getHomeSections(), getInstrumentCategories(), getSiteSettings()]);

  const sectionByKey = new Map(sections.map((section) => [section.key, section]));
  const orderedKeys = sections.map((section) => section.key);

  const phone = settings?.phone || process.env.NEXT_PUBLIC_CONTACT_PHONE || undefined;
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings?.companyName || 'Vision Analytical',
    url: siteUrl,
    description:
      settings?.seoDefaultDescription ||
      'Analytical instrument sales, refurbished HPLC/GC/LC-MS/UV systems, spare parts, AMC/CMC service, calibration and IQ/OQ/PQ qualification.',
    foundingDate: '2016',
    address: {
      '@type': 'PostalAddress',
      addressLocality: settings?.city || 'Ambarnath',
      addressRegion: settings?.state || 'Maharashtra',
      addressCountry: 'IN',
    },
    ...(phone
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: phone,
            contactType: 'sales',
            areaServed: 'IN',
          },
        }
      : {}),
  };

  return (
    <>
      <JsonLd data={organizationSchema} />

      {orderedKeys.map((key) => {
        const section = sectionByKey.get(key);
        if (!section || !section.isVisible) return null;

        switch (key) {
          case HomeSectionKey.HERO: {
            const hero = parseContent(heroContentSchema, section.content, DEFAULT_HERO_CONTENT);
            return (
              // Light hero: white ground, accent reserved for the primary action.
              // Product photography is mostly grey metal and reads poorly on a
              // dark band; the dark footer still anchors the page.
              <section key={key} className="relative overflow-hidden border-b border-border bg-surface">
                <Container className="relative grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.14em] text-primary dark:text-secondary">
                      {hero.eyebrow}
                    </p>
                    <h1 className="mt-4 max-w-[16ch] font-display text-4xl font-semibold leading-[1.06] tracking-tight text-foreground text-balance sm:text-5xl lg:text-6xl">
                      {hero.headingPrefix} <span className="text-primary dark:text-secondary">{hero.headingHighlight}</span>{' '}
                      {hero.headingSuffix}
                    </h1>
                    <p className="mt-6 max-w-[60ch] text-lg text-muted">{hero.subheading}</p>

                    <div className="mt-8 flex flex-wrap gap-2">
                      {hero.badges.map((badge) => (
                        <span
                          key={badge}
                          className="inline-flex items-center rounded-full border border-border bg-surface-muted px-3 py-1.5 text-sm text-foreground"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>

                    <div className="mt-10 flex flex-wrap gap-3">
                      <Link href={hero.primaryButtonHref} className={buttonVariants({ variant: 'primary', size: 'lg' })}>
                        {hero.primaryButtonLabel}
                      </Link>
                      <Link href={hero.secondaryButtonHref} className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                        {hero.secondaryButtonLabel}
                      </Link>
                      <a
                        href={whatsappLink(settings?.whatsappNumber, 'Hi, I need help with a laboratory instrument or spare part.')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({ variant: 'outline', size: 'lg' })}
                      >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </a>
                      <a href={telLink(settings?.phone)} className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                        <Phone className="h-4 w-4" />
                        Call Now
                      </a>
                    </div>
                  </div>

                  {hero.backgroundImage ? (
                    <div className="relative aspect-4/3 overflow-hidden rounded-xl border border-border bg-surface-muted lg:aspect-square">
                      <Image
                        src={hero.backgroundImage}
                        alt=""
                        fill
                        priority
                        sizes="(min-width: 1024px) 26rem, 100vw"
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                </Container>

                {hero.brands.length > 0 && (
                  <div className="border-t border-border bg-surface-muted">
                    <Container className="py-8">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted">Brands we sell &amp; service</p>
                      <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
                        {hero.brands.map((brand) => (
                          <span key={brand} className="font-display text-lg font-semibold text-muted">
                            {brand}
                          </span>
                        ))}
                      </div>
                    </Container>
                  </div>
                )}
              </section>
            );
          }

          case HomeSectionKey.CATEGORIES: {
            const content = parseContent(categoriesContentSchema, section.content, DEFAULT_CATEGORIES_CONTENT);
            if (categories.length === 0) return null;
            return (
              <section key={key} className="py-16 sm:py-20">
                <Container>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{content.heading}</h2>
                      <p className="mt-2 text-muted">{content.subheading}</p>
                    </div>
                    <Link href="/products" className="hidden text-sm font-medium text-primary hover:underline sm:inline dark:text-secondary">
                      View all instruments →
                    </Link>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    {categories.map((category) => (
                      <Link
                        key={category.slug}
                        href={`/products/${category.slug}`}
                        className="group rounded-xl border border-border bg-surface p-5 shadow-sm transition-colors hover:border-primary"
                      >
                        <FlaskConical className="h-6 w-6 text-primary dark:text-secondary" />
                        <p className="mt-3 font-display text-lg font-semibold text-foreground">{category.name}</p>
                        {category.description && <p className="mt-1 text-sm text-muted">{category.description}</p>}
                      </Link>
                    ))}
                  </div>
                </Container>
              </section>
            );
          }

          case HomeSectionKey.LIFECYCLE: {
            const content = parseContent(cardsContentSchema, section.content, DEFAULT_LIFECYCLE_CONTENT);
            return (
              <section key={key} className="bg-surface-muted py-16 sm:py-20">
                <Container>
                  <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{content.heading}</h2>
                  <p className="mt-2 max-w-2xl text-muted">{content.subheading}</p>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {content.cards.map((card) => {
                      const Icon = resolveIcon(card.iconKey);
                      return (
                        <Link
                          key={card.title}
                          href={card.href || '#'}
                          className="rounded-xl border border-border bg-surface p-6 shadow-sm transition-colors hover:border-primary"
                        >
                          <Icon className="h-7 w-7 text-primary dark:text-secondary" />
                          <p className="mt-4 font-display text-lg font-semibold text-foreground">{card.title}</p>
                          <p className="mt-2 text-sm text-muted">{card.description}</p>
                        </Link>
                      );
                    })}
                  </div>
                </Container>
              </section>
            );
          }

          case HomeSectionKey.WHY_US: {
            const content = parseContent(cardsContentSchema, section.content, DEFAULT_WHY_US_CONTENT);
            return (
              <section key={key} className="py-16 sm:py-20">
                <Container>
                  <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{content.heading}</h2>
                  {content.subheading && <p className="mt-2 max-w-2xl text-muted">{content.subheading}</p>}

                  <div className="mt-8 grid gap-6 sm:grid-cols-3">
                    {content.cards.map((card) => {
                      const Icon = resolveIcon(card.iconKey);
                      return (
                        <div key={card.title}>
                          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-light dark:bg-white/5">
                            <Icon className="h-5 w-5 text-primary dark:text-secondary" />
                          </div>
                          <p className="mt-4 font-display text-lg font-semibold text-foreground">{card.title}</p>
                          <p className="mt-2 text-sm text-muted">{card.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </Container>
              </section>
            );
          }

          case HomeSectionKey.CTA: {
            const content = parseContent(ctaContentSchema, section.content, DEFAULT_CTA_CONTENT);
            return (
              <section key={key} className="bg-slate-950 py-16 text-white sm:py-20">
                <Container className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="font-display text-2xl font-bold sm:text-3xl">{content.heading}</h2>
                    <p className="mt-2 text-slate-300">{content.subheading}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link href={content.buttonHref} className={buttonVariants({ variant: 'primary', size: 'lg' })}>
                      {content.buttonLabel}
                    </Link>
                    <a
                      href={telLink(settings?.phone)}
                      className={buttonVariants({ variant: 'outline', size: 'lg', className: 'border-white/25 text-white hover:bg-white/10' })}
                    >
                      <Phone className="h-4 w-4" />
                      Call Now
                    </a>
                  </div>
                </Container>
              </section>
            );
          }

          default:
            return null;
        }
      })}
    </>
  );
}
