import type { Metadata } from 'next';
import {
  MapPin,
  CalendarDays,
  Globe2,
  Clock,
  FileCheck2,
  Handshake,
  Wrench,
  FlaskConical,
  Pill,
  Leaf,
  Droplets,
  Factory,
  GraduationCap,
  Sprout,
} from 'lucide-react';
import { Container } from '@/components/ui/Container';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    "Vision Analytical is Maharashtra & Gujarat's laboratory instrument partner - sales, service, AMC and IQ/OQ/PQ qualification since 2016.",
};

const FACTS = [
  { label: 'Founded', value: '2016', icon: CalendarDays },
  { label: 'Headquarters', value: 'Ambarnath, Thane', icon: MapPin },
  { label: 'Service area', value: 'Maharashtra & Gujarat', icon: Globe2 },
];

const BRANDS = ['Shimadzu', 'Waters', 'Agilent Technologies', 'Thermo Scientific', 'Merck', 'PerkinElmer'];

const INDUSTRIES = [
  { name: 'Pharmaceutical', icon: Pill },
  { name: 'Biotechnology', icon: FlaskConical },
  { name: 'Food & Beverage QC', icon: Leaf },
  { name: 'Environmental & Water Testing', icon: Droplets },
  { name: 'Petrochemical', icon: Factory },
  { name: 'Academic & Research', icon: GraduationCap },
  { name: 'Agrochemical', icon: Sprout },
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
  {
    title: 'Multi-brand expertise',
    description: 'Our engineers are trained across Shimadzu, Waters, Agilent and Thermo platforms - not locked to one OEM.',
    icon: Wrench,
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-border bg-surface-muted py-16 sm:py-20">
        <Container>
          <p className="font-mono text-sm tracking-wide text-blue-600 dark:text-cyan-400">About Us</p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            Analytical instrument sales &amp; service, built for regulated labs
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted">
            Vision Analytical sells, services and refurbishes HPLC, GC, LC-MS, GC-MS and UV/Vis systems for labs
            across Maharashtra &amp; Gujarat - covering everything from a single spare part to a full instrument
            qualification.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-6">
            {FACTS.map((fact) => (
              <div key={fact.label} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
                <fact.icon className="h-5 w-5 shrink-0 text-blue-600 dark:text-cyan-400" />
                <div>
                  <p className="text-xs text-muted">{fact.label}</p>
                  <p className="font-medium text-foreground">{fact.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Brands we work with</h2>
          <p className="mt-2 max-w-2xl text-muted">
            Our engineers are trained on instruments from these manufacturers, for both sales and after-sales
            service.
          </p>
          <div className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            {BRANDS.map((brand) => (
              <span key={brand} className="font-display text-xl font-semibold text-foreground">
                {brand}
              </span>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-surface-muted py-16 sm:py-20">
        <Container>
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Industries we serve</h2>
          <p className="mt-2 max-w-2xl text-muted">
            From pharma QC labs to research institutions, our instruments and service plans are built around
            regulated, high-uptime environments.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {INDUSTRIES.map((industry) => (
              <div key={industry.name} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
                <industry.icon className="h-5 w-5 shrink-0 text-blue-600 dark:text-cyan-400" />
                <span className="text-sm font-medium text-foreground">{industry.name}</span>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Why Vision Analytical</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {WHY_US.map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-white/5">
                  <item.icon className="h-5 w-5 text-blue-600 dark:text-cyan-400" />
                </div>
                <div>
                  <p className="font-display text-lg font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm text-muted">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
