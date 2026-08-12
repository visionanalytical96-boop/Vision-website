import type {
  HeroContent,
  CategoriesContent,
  CardsContent,
  CtaContent,
  AboutContent,
  ServicesContent,
  ContactContent,
  HeaderContent,
  FooterContent,
  ListSectionContent,
  FeaturedProductsContent,
  OverviewContent,
  IndustriesContent,
  ContactBandContent,
  AnnouncementContent,
} from './schemas';

// Default/seed content - the exact copy the site launched with. Used both to
// seed the CMS tables (so nothing visually changes until an admin edits
// something) and as a fallback if stored content ever fails validation.

export const DEFAULT_HERO_CONTENT: HeroContent = {
  eyebrow: 'Ambarnath · Maharashtra · Since 2016',
  headingPrefix: "Maharashtra & Gujarat's trusted",
  headingHighlight: 'lab instrument',
  headingSuffix: 'partner',
  subheading:
    'Sales, service, AMC and IQ/OQ/PQ qualification for HPLC, GC, LC-MS, GC-MS and UV/Vis systems — Shimadzu, Waters, Agilent and Thermo specialists.',
  primaryButtonLabel: 'Request Quote',
  primaryButtonHref: '/contact',
  secondaryButtonLabel: 'Order Spare Parts',
  secondaryButtonHref: '/spare-parts',
  badges: [
    'Instrument Sales',
    'Refurbished Instruments',
    'Spare Parts',
    'Service & AMC',
    'Calibration',
    'IQ / OQ / PQ',
    'Technical Support',
  ],
  brands: ['Shimadzu', 'Waters', 'Agilent Technologies', 'Thermo Scientific', 'Merck', 'PerkinElmer'],
  backgroundImage: null,
};

export const DEFAULT_CATEGORIES_CONTENT: CategoriesContent = {
  heading: 'Systems we sell & service',
  subheading: 'Browse by analytical technique.',
};

export const DEFAULT_LIFECYCLE_CONTENT: CardsContent = {
  heading: 'Complete instrument lifecycle',
  subheading: 'From first purchase to end-of-life refurbishment, one team handles it all.',
  cards: [
    {
      title: 'Instrument Sales',
      description: 'New analytical instruments across HPLC, GC, LC-MS, GC-MS, UV and FTIR.',
      iconKey: 'package',
      href: '/products',
    },
    {
      title: 'Refurbished Instruments',
      description: 'Tested, validated and warranty-backed pre-owned systems.',
      iconKey: 'refresh-cw',
      href: '/refurbished',
    },
    {
      title: 'Spare Parts Store',
      description: 'Lamps, columns, seals, pump and detector parts — in stock and ready to ship.',
      iconKey: 'cog',
      href: '/spare-parts',
    },
    {
      title: 'Service & AMC',
      description: 'Installation, preventive maintenance, breakdown support, AMC/CMC and calibration.',
      iconKey: 'shield-check',
      href: '/services',
    },
  ],
};

export const DEFAULT_WHY_US_CONTENT: CardsContent = {
  heading: "Your lab's long-term partner",
  subheading: '',
  cards: [
    {
      title: 'Engineers who respond fast',
      description: 'When an instrument goes down, your QC stops. Our engineers are dispatched with spares on hand.',
      iconKey: 'clock',
    },
    {
      title: 'Audit-ready documentation',
      description: 'IQ/OQ/PQ and calibration reports written for pharma and regulated-lab audits, not just paperwork.',
      iconKey: 'file-check',
    },
    {
      title: 'One partner, full lifecycle',
      description: 'Sales, spares, service and AMC from a single team that knows your instrument history.',
      iconKey: 'handshake',
    },
  ],
};

export const DEFAULT_CTA_CONTENT: CtaContent = {
  heading: 'Need a quote or facing a breakdown?',
  subheading: 'Our team responds the same day, across Maharashtra & Gujarat.',
  buttonLabel: 'Request Quote',
  buttonHref: '/contact',
};

export const DEFAULT_COMPANY_OVERVIEW_CONTENT: OverviewContent = {
  eyebrow: 'Who we are',
  heading: 'A single team for the whole instrument lifecycle',
  body: [
    'Vision Analytical has supplied, serviced and refurbished analytical instruments for laboratories across Maharashtra and Gujarat since 2016. We work with pharma QC labs, contract testing houses, food and water testing labs, and research institutions.',
    'Because we handle sales, spares, service and qualification ourselves, we keep the full history of every instrument we touch — which is what makes a same-day breakdown response and an audit-ready qualification file possible.',
  ],
  stats: [
    { value: '2016', label: 'Serving labs since' },
    { value: '6+', label: 'Instrument techniques' },
    { value: '2', label: 'States covered' },
    { value: 'Same day', label: 'Typical response' },
  ],
  image: null,
  buttonLabel: 'More about us',
  buttonHref: '/about',
};

export const DEFAULT_FEATURED_PRODUCTS_CONTENT: FeaturedProductsContent = {
  heading: 'Featured instruments & parts',
  subheading: 'A sample of what we currently supply. Ask us about anything not listed.',
  viewAllLabel: 'Browse the full catalogue',
  viewAllHref: '/products',
  productSlugs: [],
};

export const DEFAULT_BRANDS_SECTION_CONTENT: ListSectionContent = {
  heading: 'Brands we sell & service',
  subheading: 'Our engineers are trained across the major chromatography and spectroscopy platforms.',
  viewAllLabel: 'All brands',
  viewAllHref: '/brands',
};

export const DEFAULT_INDUSTRIES_CONTENT: IndustriesContent = {
  heading: 'Industries we serve',
  subheading: 'Regulated, high-uptime environments where an instrument going down stops the line.',
  industries: [
    { name: 'Pharmaceutical', description: 'QC release testing, stability studies and audit-ready qualification.', iconKey: 'pill' },
    { name: 'Biotechnology', description: 'Method development and analytical support for biologics workflows.', iconKey: 'flask' },
    { name: 'Food & Beverage QC', description: 'Residue, additive and nutritional testing on tight turnaround.', iconKey: 'leaf' },
    { name: 'Environmental & Water', description: 'Trace contaminant and potability testing for labs and utilities.', iconKey: 'droplets' },
    { name: 'Petrochemical', description: 'Fuel, lubricant and process-stream analysis by GC and GC-MS.', iconKey: 'factory' },
    { name: 'Academic & Research', description: 'Teaching and research labs, including refurbished budget options.', iconKey: 'graduation-cap' },
  ],
};

export const DEFAULT_KNOWLEDGE_CONTENT: ListSectionContent = {
  heading: 'From the Knowledge Center',
  subheading: 'Maintenance guides, troubleshooting notes and buying advice written by our engineers.',
  viewAllLabel: 'All articles',
  viewAllHref: '/blog',
};

export const DEFAULT_TESTIMONIALS_CONTENT: ListSectionContent = {
  heading: 'What lab teams say',
  subheading: '',
  viewAllLabel: 'Talk to us',
  viewAllHref: '/contact',
};

export const DEFAULT_CONTACT_BAND_CONTENT: ContactBandContent = {
  heading: 'Talk to an engineer, not a call centre',
  subheading: 'Quotes, spare-part availability and breakdown support — reach us whichever way suits you.',
  hoursLabel: 'Office hours',
  hoursValue: 'Mon–Sat, 9:30 am – 6:30 pm IST',
};

export const DEFAULT_ANNOUNCEMENT_CONTENT: AnnouncementContent = {
  isEnabled: false,
  message: 'Spare parts for HPLC and GC in stock — same-week dispatch across Maharashtra & Gujarat.',
  linkLabel: 'Browse spare parts',
  linkHref: '/spare-parts',
};

export const DEFAULT_ABOUT_CONTENT: AboutContent = {
  eyebrow: 'About Us',
  heading: 'Analytical instrument sales & service, built for regulated labs',
  subheading:
    'Vision Analytical sells, services and refurbishes HPLC, GC, LC-MS, GC-MS and UV/Vis systems for labs across Maharashtra & Gujarat - covering everything from a single spare part to a full instrument qualification.',
  facts: [
    { label: 'Founded', value: '2016', iconKey: 'calendar' },
    { label: 'Headquarters', value: 'Ambarnath, Thane', iconKey: 'map-pin' },
    { label: 'Service area', value: 'Maharashtra & Gujarat', iconKey: 'globe' },
  ],
  brandsHeading: 'Brands we work with',
  brandsSubheading: 'Our engineers are trained on instruments from these manufacturers, for both sales and after-sales service.',
  brands: ['Shimadzu', 'Waters', 'Agilent Technologies', 'Thermo Scientific', 'Merck', 'PerkinElmer'],
  industriesHeading: 'Industries we serve',
  industriesSubheading:
    'From pharma QC labs to research institutions, our instruments and service plans are built around regulated, high-uptime environments.',
  industries: [
    { name: 'Pharmaceutical', iconKey: 'pill' },
    { name: 'Biotechnology', iconKey: 'flask' },
    { name: 'Food & Beverage QC', iconKey: 'leaf' },
    { name: 'Environmental & Water Testing', iconKey: 'droplets' },
    { name: 'Petrochemical', iconKey: 'factory' },
    { name: 'Academic & Research', iconKey: 'graduation-cap' },
    { name: 'Agrochemical', iconKey: 'sprout' },
  ],
  whyUsHeading: 'Why Vision Analytical',
  whyUs: [
    {
      title: 'Engineers who respond fast',
      description: 'When an instrument goes down, your QC stops. Our engineers are dispatched with spares on hand.',
      iconKey: 'clock',
    },
    {
      title: 'Audit-ready documentation',
      description: 'IQ/OQ/PQ and calibration reports written for pharma and regulated-lab audits, not just paperwork.',
      iconKey: 'file-check',
    },
    {
      title: 'One partner, full lifecycle',
      description: 'Sales, spares, service and AMC from a single team that knows your instrument history.',
      iconKey: 'handshake',
    },
    {
      title: 'Multi-brand expertise',
      description: "Our engineers are trained across Shimadzu, Waters, Agilent and Thermo platforms - not locked to one OEM.",
      iconKey: 'wrench',
    },
  ],
};

export const DEFAULT_SERVICES_CONTENT: ServicesContent = {
  eyebrow: 'Services',
  heading: 'Installation through validation, from one team',
  subheading: 'Every service below is available as a one-off visit or bundled into an AMC/CMC plan.',
  groups: [
    {
      id: 'maintenance',
      title: 'Maintenance & Support',
      services: [
        { name: 'Installation', description: 'Site preparation guidance and full instrument installation by trained engineers.', iconKey: 'wrench' },
        { name: 'Preventive Maintenance', description: 'Scheduled maintenance visits to catch wear before it causes downtime.', iconKey: 'calendar-clock' },
        { name: 'Breakdown Service', description: 'On-call breakdown support with engineers who carry common spares.', iconKey: 'alert-triangle' },
        { name: 'AMC', description: 'Annual maintenance contracts covering scheduled visits and priority breakdown response.', iconKey: 'shield-check' },
        { name: 'CMC', description: 'Comprehensive maintenance contracts that also cover spare parts within the plan.', iconKey: 'file-check' },
      ],
    },
    {
      id: 'qualification',
      title: 'Qualification & Compliance',
      services: [
        { name: 'Calibration', description: 'Instrument calibration against traceable standards, with certificates.', iconKey: 'gauge' },
        { name: 'IQ', description: 'Installation Qualification documentation confirming correct setup.', iconKey: 'clipboard-check' },
        { name: 'OQ', description: 'Operational Qualification testing instrument performance against specification.', iconKey: 'beaker' },
        { name: 'PQ', description: 'Performance Qualification under real operating conditions for routine use.', iconKey: 'microscope' },
        { name: 'Validation', description: 'Full qualification packages built for pharma and regulated-lab audits.', iconKey: 'badge-check' },
      ],
    },
    {
      id: 'training',
      title: 'Training & Setup',
      services: [
        { name: 'Software Installation', description: 'Instrument control and data-analysis software installation and configuration.', iconKey: 'laptop' },
        { name: 'Training', description: 'Hands-on operator and maintenance training for your lab team.', iconKey: 'graduation-cap' },
      ],
    },
  ],
  ctaHeading: 'Need a service plan or a breakdown visit?',
  ctaSubheading: "Tell us about your instrument and we'll recommend the right plan.",
  ctaButtonLabel: 'Contact Us',
};

export const DEFAULT_CONTACT_CONTENT: ContactContent = {
  heading: 'Contact Us',
  subheading: 'Reach us for quotes, spare parts, service requests or general questions - we typically respond the same day.',
  emergencyHeading: 'Emergency breakdown support',
  emergencyText: 'Instrument down? Call or WhatsApp us directly for the fastest response.',
  locationHeading: 'Location',
  locationText: 'Ambarnath, Thane, Maharashtra - serving Maharashtra & Gujarat.',
};

export const DEFAULT_HEADER_CONTENT: HeaderContent = {
  navLinks: [
    { href: '/products', label: 'Instruments' },
    { href: '/spare-parts', label: 'Spare Parts' },
    { href: '/refurbished', label: 'Refurbished' },
    { href: '/brands', label: 'Brands' },
    { href: '/services', label: 'Services' },
    { href: '/blog', label: 'Knowledge Center' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ],
};

export const DEFAULT_FOOTER_CONTENT: FooterContent = {
  tagline: 'Laboratory instrument sales, refurbishment, spare parts and service across Maharashtra & Gujarat.',
  companyColumnHeading: 'Company',
  categoryColumnHeading: 'Categories',
  categoryLinks: [
    { href: '/products/hplc', label: 'HPLC' },
    { href: '/products/gc', label: 'GC' },
    { href: '/products/lc-ms', label: 'LC-MS' },
    { href: '/products/gc-ms', label: 'GC-MS' },
    { href: '/products/uv', label: 'UV-Vis' },
    { href: '/products/ftir', label: 'FTIR' },
  ],
  serviceColumnHeading: 'Services',
  serviceLinks: [
    { href: '/services#amc', label: 'AMC / CMC' },
    { href: '/services#calibration', label: 'Calibration' },
    { href: '/services#iqoqpq', label: 'IQ / OQ / PQ' },
    { href: '/services#installation', label: 'Installation' },
    { href: '/downloads', label: 'Downloads' },
  ],
};
