import { Wrench } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { telLink, whatsappLink, resolvePhone, resolveWhatsappNumber } from '@/lib/contact-links';
import { buttonVariants } from '@/components/ui/Button';
import type { SiteSettings } from '@/generated/prisma/client';

/**
 * Shown to the public while maintenance mode is on. It still carries the phone
 * and WhatsApp details: a lab with a down instrument needs to reach someone
 * whether or not the website is taking visitors.
 */
export function MaintenanceNotice({ settings }: { settings: SiteSettings | null }) {
  const phone = resolvePhone(settings?.phone);
  const whatsapp = resolveWhatsappNumber(settings?.whatsappNumber);

  return (
    <main className="flex flex-1 items-center py-20">
      <Container className="max-w-xl text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light dark:bg-white/5">
          <Wrench className="h-6 w-6 text-primary dark:text-secondary" aria-hidden />
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          We&apos;ll be back shortly
        </h1>
        <p className="mt-3 text-muted">
          {settings?.companyName || 'Vision Analytical'} is carrying out scheduled maintenance. Instrument down or need
          a part urgently? Reach us directly — we&apos;re still answering.
        </p>

        {(phone || whatsapp) && (
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {phone && (
              <a href={telLink(phone)} className={buttonVariants({ variant: 'primary' })}>
                Call {phone}
              </a>
            )}
            {whatsapp && (
              <a
                href={whatsappLink(whatsapp, 'Hi, I need help with a laboratory instrument or spare part.')}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: 'outline' })}
              >
                WhatsApp
              </a>
            )}
          </div>
        )}
      </Container>
    </main>
  );
}
