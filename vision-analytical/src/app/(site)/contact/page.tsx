import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, MessageCircle, Phone, AlertTriangle, Headset } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { ContactForm } from '@/components/forms/ContactForm';
import { buttonVariants } from '@/components/ui/Button';
import { whatsappLink, telLink } from '@/lib/contact-links';
import { getPageContent } from '@/lib/data/cms';
import { contactContentSchema, parseContent } from '@/lib/cms/schemas';
import { DEFAULT_CONTACT_CONTENT } from '@/lib/cms/defaults';
import { ContentPageKey } from '@/generated/prisma/enums';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with Vision Analytical for quotes, service requests, or breakdown support.',
};

export default async function ContactPage(props: PageProps<'/contact'>) {
  const [searchParams, page] = await Promise.all([props.searchParams, getPageContent(ContentPageKey.CONTACT)]);
  const content = parseContent(contactContentSchema, page?.content, DEFAULT_CONTACT_CONTENT);
  const product = typeof searchParams.product === 'string' ? searchParams.product : undefined;
  const defaultSubject = product ? `Enquiry about: ${product}` : undefined;

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">{content.heading}</h1>
      <p className="mt-3 max-w-2xl text-muted">{content.subheading}</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <div className="rounded-xl border border-danger/30 bg-danger-bg p-5">
            <div className="flex items-center gap-2 text-danger">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-semibold">{content.emergencyHeading}</p>
            </div>
            <p className="mt-2 text-sm text-foreground">{content.emergencyText}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={telLink()} className={buttonVariants({ variant: 'danger', size: 'sm' })}>
                <Phone className="h-4 w-4" />
                Call Now
              </a>
              <a
                href={whatsappLink('Hi, our instrument is down and we need urgent support.')}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 text-foreground">
              <Headset className="h-5 w-5 text-primary dark:text-secondary" />
              <p className="font-semibold">Already a customer?</p>
            </div>
            <p className="mt-2 text-sm text-muted">
              Log in to raise and track a formal service request, or check your AMC status.
            </p>
            <Link href="/login?next=/portal/service-requests/new" className="mt-3 inline-block text-sm font-medium text-primary hover:underline dark:text-secondary">
              Log in to your account →
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 text-foreground">
              <MapPin className="h-5 w-5 text-primary dark:text-secondary" />
              <p className="font-semibold">{content.locationHeading}</p>
            </div>
            <p className="mt-2 text-sm text-muted">{content.locationText}</p>
            {/* Area-level map; pending an exact verified address from the business. */}
            <div className="mt-4 overflow-hidden rounded-lg border border-border">
              <iframe
                title="Vision Analytical service area map"
                src="https://maps.google.com/maps?q=Ambarnath%2C+Thane%2C+Maharashtra&output=embed"
                className="h-56 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="font-display text-lg font-semibold text-foreground">Send us a message</p>
          <div className="mt-4">
            <ContactForm defaultSubject={defaultSubject} />
          </div>
        </div>
      </div>
    </Container>
  );
}
