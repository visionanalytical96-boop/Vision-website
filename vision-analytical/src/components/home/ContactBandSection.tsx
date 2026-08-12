import { Phone, MessageCircle, Mail, MapPin, Clock, type LucideIcon } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { whatsappLink, telLink, resolvePhone, resolveWhatsappNumber } from '@/lib/contact-links';
import type { SiteSettings } from '@/generated/prisma/client';
import type { ContactBandContent } from '@/lib/cms/schemas';

/**
 * Contact details come from Business Settings, not the CMS copy, so there is
 * one place to change a phone number. Each channel only renders when it has
 * been filled in.
 */
export function ContactBandSection({
  content,
  settings,
}: {
  content: ContactBandContent;
  settings: SiteSettings | null;
}) {
  const location = [settings?.addressLine, settings?.city, settings?.state].filter(Boolean).join(', ');

  interface Channel {
    key: string;
    icon: LucideIcon;
    label: string;
    value: string;
    href: string | null;
    external?: boolean;
  }

  // Same resolution as every other contact link on the site: Business Settings
  // first, then the env fallback a fresh deployment ships with.
  const phone = resolvePhone(settings?.phone);
  const whatsapp = resolveWhatsappNumber(settings?.whatsappNumber);

  const channels: Channel[] = [];
  if (phone) {
    channels.push({ key: 'phone', icon: Phone, label: 'Call us', value: phone, href: telLink(phone) });
  }
  if (whatsapp) {
    channels.push({
      key: 'whatsapp',
      icon: MessageCircle,
      label: 'WhatsApp',
      value: whatsapp,
      href: whatsappLink(whatsapp, 'Hi, I need help with a laboratory instrument or spare part.'),
      external: true,
    });
  }
  if (settings?.email) {
    channels.push({ key: 'email', icon: Mail, label: 'Email', value: settings.email, href: `mailto:${settings.email}` });
  }
  if (location) {
    channels.push({ key: 'location', icon: MapPin, label: 'Visit', value: location, href: null });
  }
  if (content.hoursValue) {
    channels.push({ key: 'hours', icon: Clock, label: content.hoursLabel, value: content.hoursValue, href: null });
  }

  if (channels.length === 0) return null;

  return (
    <section className="border-y border-border bg-surface py-16 sm:py-20">
      <Container>
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{content.heading}</h2>
          {content.subheading ? <p className="mt-2 text-muted">{content.subheading}</p> : null}
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => {
            const Icon = channel.icon;
            const body = (
              <>
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary-light dark:bg-white/5">
                  <Icon className="h-5 w-5 text-primary dark:text-secondary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.08em] text-muted">{channel.label}</p>
                  <p className="mt-0.5 font-medium text-foreground">{channel.value}</p>
                </div>
              </>
            );
            const className = 'flex h-full items-center gap-4 rounded-xl border border-border bg-surface p-5';

            return (
              <li key={channel.key}>
                {channel.href ? (
                  <a
                    href={channel.href}
                    className={`${className} transition-colors hover:border-primary`}
                    {...(channel.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {body}
                  </a>
                ) : (
                  <div className={className}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
