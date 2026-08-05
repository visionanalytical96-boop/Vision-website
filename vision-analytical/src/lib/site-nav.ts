export interface NavLink {
  href: string;
  label: string;
}

export const MAIN_NAV_LINKS: NavLink[] = [
  { href: '/products', label: 'Instruments' },
  { href: '/spare-parts', label: 'Spare Parts' },
  { href: '/refurbished', label: 'Refurbished' },
  { href: '/services', label: 'Services' },
  { href: '/blog', label: 'Knowledge Center' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];
