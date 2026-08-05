import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Wrench,
  CalendarClock,
  AlertTriangle,
  ShieldCheck,
  FileCheck2,
  Gauge,
  ClipboardCheck,
  Beaker,
  Microscope,
  BadgeCheck,
  Laptop,
  GraduationCap,
} from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { buttonVariants } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Installation, preventive maintenance, breakdown support, AMC/CMC, calibration, IQ/OQ/PQ and validation for analytical instruments.',
};

const SERVICE_GROUPS = [
  {
    id: 'maintenance',
    title: 'Maintenance & Support',
    services: [
      { name: 'Installation', icon: Wrench, description: 'Site preparation guidance and full instrument installation by trained engineers.' },
      { name: 'Preventive Maintenance', icon: CalendarClock, description: 'Scheduled maintenance visits to catch wear before it causes downtime.' },
      { name: 'Breakdown Service', icon: AlertTriangle, description: 'On-call breakdown support with engineers who carry common spares.' },
      { name: 'AMC', icon: ShieldCheck, description: 'Annual maintenance contracts covering scheduled visits and priority breakdown response.' },
      { name: 'CMC', icon: FileCheck2, description: 'Comprehensive maintenance contracts that also cover spare parts within the plan.' },
    ],
  },
  {
    id: 'qualification',
    title: 'Qualification & Compliance',
    services: [
      { name: 'Calibration', icon: Gauge, description: 'Instrument calibration against traceable standards, with certificates.' },
      { name: 'IQ', icon: ClipboardCheck, description: 'Installation Qualification documentation confirming correct setup.' },
      { name: 'OQ', icon: Beaker, description: 'Operational Qualification testing instrument performance against specification.' },
      { name: 'PQ', icon: Microscope, description: 'Performance Qualification under real operating conditions for routine use.' },
      { name: 'Validation', icon: BadgeCheck, description: 'Full qualification packages built for pharma and regulated-lab audits.' },
    ],
  },
  {
    id: 'training',
    title: 'Training & Setup',
    services: [
      { name: 'Software Installation', icon: Laptop, description: 'Instrument control and data-analysis software installation and configuration.' },
      { name: 'Training', icon: GraduationCap, description: 'Hands-on operator and maintenance training for your lab team.' },
    ],
  },
];

export default function ServicesPage() {
  return (
    <>
      <section className="border-b border-border bg-surface-muted py-16 sm:py-20">
        <Container>
          <p className="font-mono text-sm tracking-wide text-blue-600 dark:text-cyan-400">Services</p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-bold text-foreground sm:text-4xl">
            Installation through validation, from one team
          </h1>
          <p className="mt-4 max-w-2xl text-muted">
            Every service below is available as a one-off visit or bundled into an AMC/CMC plan. Already a
            customer with an urgent issue?{' '}
            <Link href="/login?next=/portal/service-requests/new" className="text-blue-600 hover:underline dark:text-cyan-400">
              Log in to raise a service request
            </Link>
            .
          </p>
        </Container>
      </section>

      {SERVICE_GROUPS.map((group) => (
        <section key={group.id} id={group.id} className="py-16 sm:py-20">
          <Container>
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{group.title}</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.services.map((service) => (
                <div key={service.name} className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                  <service.icon className="h-6 w-6 text-blue-600 dark:text-cyan-400" />
                  <p className="mt-3 font-display text-lg font-semibold text-foreground">{service.name}</p>
                  <p className="mt-2 text-sm text-muted">{service.description}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>
      ))}

      <section className="bg-slate-950 py-16 text-white sm:py-20">
        <Container className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Need a service plan or a breakdown visit?</h2>
            <p className="mt-2 text-slate-300">Tell us about your instrument and we&rsquo;ll recommend the right plan.</p>
          </div>
          <Link href="/contact" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
            Contact Us
          </Link>
        </Container>
      </section>
    </>
  );
}
