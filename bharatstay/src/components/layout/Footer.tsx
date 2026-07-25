import Link from 'next/link';
import { Logo } from './Logo';

const FOOTER_COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Company',
    links: [
      { label: 'About BharatStay', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Blog', href: '/blog' },
      { label: 'Contact Us', href: '/contact' },
    ],
  },
  {
    title: 'Explore',
    links: [
      { label: 'Hotels', href: '/hotels' },
      { label: 'Flights', href: '/flights' },
      { label: 'Buses', href: '/buses' },
      { label: 'Cabs', href: '/cabs' },
      { label: 'Holiday Packages', href: '/packages' },
      { label: 'Offers', href: '/offers' },
    ],
  },
  {
    title: 'Partner with us',
    links: [
      { label: 'List Your Property', href: '/list-your-property' },
      { label: 'Partner Login', href: '/partner/login' },
      { label: 'Travel Agent Login', href: '/agent/login' },
      { label: 'Corporate Travel', href: '/corporate-travel' },
      { label: 'Partner Terms', href: '/legal/partner-terms' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Customer Support', href: '/support' },
      { label: 'FAQs', href: '/faqs' },
      { label: 'My Bookings', href: '/dashboard/customer/bookings' },
      { label: 'Payment Status', href: '/payment-status' },
      { label: 'Refund Status', href: '/refund-status' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/legal/privacy-policy' },
      { label: 'Terms & Conditions', href: '/legal/terms' },
      { label: 'Cancellation Policy', href: '/legal/cancellation-policy' },
      { label: 'Refund Policy', href: '/legal/refund-policy' },
      { label: 'GST Information', href: '/legal/gst-information' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-surface-border bg-royal-900 text-royal-100">
      <div className="container-xl grid grid-cols-2 gap-8 py-12 sm:grid-cols-3 lg:grid-cols-6">
        <div className="col-span-2 sm:col-span-3 lg:col-span-1">
          <Logo className="[&_span]:text-white" />
          <p className="mt-4 max-w-xs text-sm text-royal-300">
            India&rsquo;s complete travel booking platform — hotels, flights, buses, cabs and holiday packages, all in one place.
          </p>
          <div className="mt-4 flex gap-3 text-xl">
            <span aria-hidden>📘</span>
            <span aria-hidden>📸</span>
            <span aria-hidden>🐦</span>
            <span aria-hidden>▶️</span>
          </div>
        </div>
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="mb-3 text-sm font-semibold text-white">{col.title}</h3>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-royal-300 hover:text-saffron-300">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-royal-800">
        <div className="container-xl flex flex-col items-center justify-between gap-2 py-4 text-xs text-royal-400 sm:flex-row">
          <p>© {new Date().getFullYear()} BharatStay Travels Pvt. Ltd. All rights reserved.</p>
          <p>GSTIN: 27ABCDE1234F1Z5 · Mumbai, Maharashtra, India</p>
        </div>
      </div>
    </footer>
  );
}
