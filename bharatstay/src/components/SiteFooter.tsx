import Link from 'next/link';
import { getNavLinks, getSettings } from '@/lib/site';
import { Logo } from './Logo';
import { NewsletterForm } from './NewsletterForm';

export async function SiteFooter() {
  const [links, settings] = await Promise.all([getNavLinks(), getSettings()]);

  return (
    <footer className="mt-20 border-t" style={{ background: 'var(--panel)', color: 'var(--panel-ink)' }}>
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <div className="inline-flex items-center gap-3">
              <Logo size={38} />
              <span className="display text-[24px]">
                {settings.brandA}
                <span style={{ color: 'var(--turmeric)' }}>{settings.brandB}</span>
              </span>
            </div>
            <p className="mt-3 max-w-[34ch] text-[13.5px] leading-relaxed opacity-70">{settings.tagline}</p>
          </div>

          <div>
            <div className="eyebrow" style={{ color: 'inherit', opacity: 0.5 }}>
              Explore
            </div>
            <ul className="mt-3 space-y-2">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[14px] opacity-80 hover:opacity-100">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="eyebrow" style={{ color: 'inherit', opacity: 0.5 }}>
              For owners
            </div>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/partner/apply" className="text-[14px] opacity-80 hover:opacity-100">
                  List your property
                </Link>
              </li>
              <li>
                <Link href="/partner/status" className="text-[14px] opacity-80 hover:opacity-100">
                  Check application status
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="eyebrow" style={{ color: 'inherit', opacity: 0.5 }}>
              Contact
            </div>
            <ul className="mt-3 space-y-2 text-[14px] opacity-80">
              <li>
                <Link href="/contact" className="hover:opacity-100">
                  Contact form
                </Link>
              </li>
              <li>{settings.supportEmail}</li>
              {settings.supportPhone && <li className="data text-[13px]">{settings.supportPhone}</li>}
              <li>{settings.city}</li>
              {settings.gstin && <li className="data text-[12.5px]">GSTIN {settings.gstin}</li>}
            </ul>
          </div>

          <div>
            <div className="eyebrow" style={{ color: 'inherit', opacity: 0.5 }}>
              Newsletter
            </div>
            <p className="mt-3 text-[13.5px] leading-relaxed opacity-70">
              Nayi jagahein aur weekend plans, mahine mein ek baar.
            </p>
            <NewsletterForm />
          </div>
        </div>

        <p className="mt-12 border-t pt-6 text-[12.5px] leading-relaxed opacity-55" style={{ borderColor: 'rgb(255 255 255 / 0.12)' }}>
          {settings.dataNotice}
        </p>
        <p className="mt-2 text-[12.5px] opacity-45">
          © {new Date().getFullYear()} {settings.brandA}
          {settings.brandB}. Maharashtra ke liye banaya gaya.
        </p>
      </div>
    </footer>
  );
}
