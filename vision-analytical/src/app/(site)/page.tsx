import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Package,
  RefreshCw,
  Cog,
  ShieldCheck,
  Gauge,
  ClipboardCheck,
  Headset,
  MessageCircle,
  Phone,
  FlaskConical,
  Clock,
  FileCheck2,
  Handshake,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { JsonLd } from '@/components/seo/JsonLd';
import { whatsappLink, telLink } from '@/lib/contact-links';

export const metadata: Metadata = {
  title: 'Home',
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Vision Analytical',
  url: siteUrl,
  description:
    'Analytical instrument sales, refurbished HPLC/GC/LC-MS/UV systems, spare parts, AMC/CMC service, calibration and IQ/OQ/PQ qualification.',
  foundingDate: '2016',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Ambarnath',
    addressRegion: 'Maharashtra',
    addressCountry: 'IN',
  },
  ...(process.env.NEXT_PUBLIC_CONTACT_PHONE
    ? {
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: process.env.NEXT_PUBLIC_CONTACT_PHONE,
          contactType: 'sales',
          areaServed: 'IN',
        },
      }
    : {}),
};

const OFFERINGS = [
  { label: 'Instrument Sales', icon: Package },
  { label: 'Refurbished Instruments', icon: RefreshCw },
  { label: 'Spare Parts', icon: Cog },
  { label: 'Service & AMC', icon: ShieldCheck },
  { label: 'Calibration', icon: Gauge },
  { label: 'IQ / OQ / PQ', icon: ClipboardCheck },
  { label: 'Technical Support', icon: Headset },
];

const BRANDS = ['Shimadzu', 'Waters', 'Agilent Technologies', 'Thermo Scientific', 'Merck', 'PerkinElmer'];

const CATEGORIES = [
  { slug: 'hplc', name: 'HPLC', description: 'High-performance liquid chromatography systems' },
  { slug: 'gc', name: 'GC', description: 'Gas chromatography systems & detectors' },
  { slug: 'lc-ms', name: 'LC-MS', description: 'Liquid chromatography mass spectrometry' },
  { slug: 'gc-ms', name: 'GC-MS', description: 'Gas chromatography mass spectrometry' },
  { slug: 'uv', name: 'UV-Vis', description: 'UV-Visible spectrophotometers' },
  { slug: 'ftir', name: 'FTIR', description: 'Fourier-transform infrared spectrometers' },
];

const LIFECYCLE_CARDS = [
  {
    href: '/products',
    title: 'Instrument Sales',
    description: 'New analytical instruments across HPLC, GC, LC-MS, GC-MS, UV and FTIR.',
    icon: Package,
  },
  {
    href: '/refurbished',
    title: 'Refurbished Instruments',
    description: 'Tested, validated and warranty-backed pre-owned systems.',
    icon: RefreshCw,
  },
  {
    href: '/spare-parts',
    title: 'Spare Parts Store',
    description: 'Lamps, columns, seals, pump and detector parts — in stock and ready to ship.',
    icon: Cog,
  },
  {
    href: '/services',
    title: 'Service & AMC',
    description: 'Installation, preventive maintenance, breakdown support, AMC/CMC and calibration.',
    icon: ShieldCheck,
  },
];

const WHY_US = [
  {
    title: 'Engineers who respond fast',
    description: 'When an instrument goes down, your QC stops. Our engineers are dispatched with spares on hand.',
    icon: Clock,
  },
  {
    title: 'Audit-ready documentation',
    description: 'IQ/OQ/PQ and calibration reports written for pharma and regulated-lab audits, not just paperwork.',
    icon: FileCheck2,
  },
  {
    title: 'One partner, full lifecycle',
    description: 'Sales, spares, service and AMC from a single team that knows your instrument history.',
    icon: Handshake,
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={organizationSchema} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(circle at 20% -10%, rgba(37,99,235,0.35), transparent 45%), radial-gradient(circle at 85% 10%, rgba(34,211,238,0.25), transparent 40%)',
          }}
        />
        <Container className="relative py-20 sm:py-28">
          <p className="font-mono text-sm tracking-wide text-cyan-400">Ambarnath · Maharashtra · Since 2016</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">
            Maharashtra &amp; Gujarat&rsquo;s trusted{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              lab instrument
            </span>{' '}
            partner
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-300">
            Sales, service, AMC and IQ/OQ/PQ qualification for HPLC, GC, LC-MS, GC-MS and UV/Vis systems —
            Shimadzu, Waters, Agilent and Thermo specialists.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {OFFERINGS.map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-200"
              >
                <item.icon className="h-3.5 w-3.5 text-cyan-400" />
                {item.label}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/contact" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
              Request Quote
            </Link>
            <Link
              href="/spare-parts"
              className={buttonVariants({
                variant: 'outline',
                size: 'lg',
                className: 'border-white/25 text-white hover:bg-white/10',
              })}
            >
              Order Spare Parts
            </Link>
            <a
              href={whatsappLink('Hi, I need help with a laboratory instrument or spare part.')}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({
                variant: 'outline',
                size: 'lg',
                className: 'border-white/25 text-white hover:bg-white/10',
              })}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
            <a
              href={telLink()}
              className={buttonVariants({
                variant: 'outline',
                size: 'lg',
                className: 'border-white/25 text-white hover:bg-white/10',
              })}
            >
              <Phone className="h-4 w-4" />
              Call Now
            </a>
          </div>

          <div className="mt-16 border-t border-white/10 pt-8">
            <p className="text-xs tracking-widest text-slate-400 uppercase">Brands we sell &amp; service</p>
            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
              {BRANDS.map((brand) => (
                <span key={brand} className="font-display text-lg font-semibold text-slate-300">
                  {brand}
                </span>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Categories */}
      <section className="py-16 sm:py-20">
        <Container>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                Systems we sell &amp; service
              </h2>
              <p className="mt-2 text-muted">Browse by analytical technique.</p>
            </div>
            <Link
              href="/products"
              className="hidden text-sm font-medium text-blue-600 hover:underline sm:inline dark:text-cyan-400"
            >
              View all instruments →
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                href={`/products/${category.slug}`}
                className="group rounded-xl border border-border bg-surface p-5 shadow-sm transition-colors hover:border-blue-500"
              >
                <FlaskConical className="h-6 w-6 text-blue-600 dark:text-cyan-400" />
                <p className="mt-3 font-display text-lg font-semibold text-foreground">{category.name}</p>
                <p className="mt-1 text-sm text-muted">{category.description}</p>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Lifecycle cards */}
      <section className="bg-surface-muted py-16 sm:py-20">
        <Container>
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Complete instrument lifecycle
          </h2>
          <p className="mt-2 max-w-2xl text-muted">
            From first purchase to end-of-life refurbishment, one team handles it all.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LIFECYCLE_CARDS.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="rounded-xl border border-border bg-surface p-6 shadow-sm transition-colors hover:border-blue-500"
              >
                <card.icon className="h-7 w-7 text-blue-600 dark:text-cyan-400" />
                <p className="mt-4 font-display text-lg font-semibold text-foreground">{card.title}</p>
                <p className="mt-2 text-sm text-muted">{card.description}</p>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Why us */}
      <section className="py-16 sm:py-20">
        <Container>
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Your lab&rsquo;s long-term partner
          </h2>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {WHY_US.map((item) => (
              <div key={item.title}>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 dark:bg-white/5">
                  <item.icon className="h-5 w-5 text-blue-600 dark:text-cyan-400" />
                </div>
                <p className="mt-4 font-display text-lg font-semibold text-foreground">{item.title}</p>
                <p className="mt-2 text-sm text-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Bottom CTA */}
      <section className="bg-slate-950 py-16 text-white sm:py-20">
        <Container className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Need a quote or facing a breakdown?</h2>
            <p className="mt-2 text-slate-300">Our team responds the same day, across Maharashtra &amp; Gujarat.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/contact" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
              Request Quote
            </Link>
            <a
              href={telLink()}
              className={buttonVariants({
                variant: 'outline',
                size: 'lg',
                className: 'border-white/25 text-white hover:bg-white/10',
              })}
            >
              <Phone className="h-4 w-4" />
              Call Now
            </a>
          </div>
        </Container>
      </section>
    </>
  );
}
