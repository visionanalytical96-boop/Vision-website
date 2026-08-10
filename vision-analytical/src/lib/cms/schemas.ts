import { z } from 'zod';
import { HEADING_FONT_KEYS, BODY_FONT_KEYS, BUTTON_STYLE_KEYS } from './theme';

const cardSchema = z.object({
  title: z.string(),
  description: z.string(),
  iconKey: z.string(),
  href: z.string().optional(),
});

const linkSchema = z.object({
  label: z.string(),
  href: z.string(),
});

export const heroContentSchema = z.object({
  eyebrow: z.string(),
  headingPrefix: z.string(),
  headingHighlight: z.string(),
  headingSuffix: z.string(),
  subheading: z.string(),
  primaryButtonLabel: z.string(),
  primaryButtonHref: z.string(),
  secondaryButtonLabel: z.string(),
  secondaryButtonHref: z.string(),
  badges: z.array(z.string()),
  brands: z.array(z.string()),
  backgroundImage: z.string().nullable(),
});
export type HeroContent = z.infer<typeof heroContentSchema>;

export const categoriesContentSchema = z.object({
  heading: z.string(),
  subheading: z.string(),
});
export type CategoriesContent = z.infer<typeof categoriesContentSchema>;

export const cardsContentSchema = z.object({
  heading: z.string(),
  subheading: z.string(),
  cards: z.array(cardSchema),
});
export type CardsContent = z.infer<typeof cardsContentSchema>;

export const ctaContentSchema = z.object({
  heading: z.string(),
  subheading: z.string(),
  buttonLabel: z.string(),
  buttonHref: z.string(),
});
export type CtaContent = z.infer<typeof ctaContentSchema>;

export const factContentSchema = z.object({
  label: z.string(),
  value: z.string(),
  iconKey: z.string(),
});

export const aboutContentSchema = z.object({
  eyebrow: z.string(),
  heading: z.string(),
  subheading: z.string(),
  facts: z.array(factContentSchema),
  brandsHeading: z.string(),
  brandsSubheading: z.string(),
  brands: z.array(z.string()),
  industriesHeading: z.string(),
  industriesSubheading: z.string(),
  industries: z.array(z.object({ name: z.string(), iconKey: z.string() })),
  whyUsHeading: z.string(),
  whyUs: z.array(z.object({ title: z.string(), description: z.string(), iconKey: z.string() })),
});
export type AboutContent = z.infer<typeof aboutContentSchema>;

export const serviceGroupSchema = z.object({
  id: z.string(),
  title: z.string(),
  services: z.array(z.object({ name: z.string(), description: z.string(), iconKey: z.string() })),
});

export const servicesContentSchema = z.object({
  eyebrow: z.string(),
  heading: z.string(),
  subheading: z.string(),
  groups: z.array(serviceGroupSchema),
  ctaHeading: z.string(),
  ctaSubheading: z.string(),
  ctaButtonLabel: z.string(),
});
export type ServicesContent = z.infer<typeof servicesContentSchema>;

export const contactContentSchema = z.object({
  heading: z.string(),
  subheading: z.string(),
  emergencyHeading: z.string(),
  emergencyText: z.string(),
  locationHeading: z.string(),
  locationText: z.string(),
});
export type ContactContent = z.infer<typeof contactContentSchema>;

export const headerContentSchema = z.object({
  navLinks: z.array(linkSchema),
});
export type HeaderContent = z.infer<typeof headerContentSchema>;

export const footerContentSchema = z.object({
  tagline: z.string(),
  companyColumnHeading: z.string(),
  categoryColumnHeading: z.string(),
  categoryLinks: z.array(linkSchema),
  serviceColumnHeading: z.string(),
  serviceLinks: z.array(linkSchema),
});
export type FooterContent = z.infer<typeof footerContentSchema>;

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export const themeSettingsSchema = z.object({
  primaryColor: z.string().regex(HEX_COLOR_RE, 'Must be a hex color like #2563eb'),
  secondaryColor: z.string().regex(HEX_COLOR_RE, 'Must be a hex color like #22d3ee'),
  fontHeading: z.enum(HEADING_FONT_KEYS),
  fontBody: z.enum(BODY_FONT_KEYS),
  buttonStyle: z.enum(BUTTON_STYLE_KEYS),
  animationsEnabled: z.boolean(),
});
export type ThemeSettingsInput = z.infer<typeof themeSettingsSchema>;

const optionalString = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value.length === 0 ? null : value))
  .nullable();

const optionalUrl = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length === 0 || z.string().url().safeParse(value).success, 'Must be a valid URL')
  .transform((value) => (value.length === 0 ? null : value))
  .nullable();

export const siteSettingsSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  addressLine: optionalString,
  city: optionalString,
  state: optionalString,
  country: z.string().min(1, 'Country is required'),
  phone: optionalString,
  whatsappNumber: optionalString,
  email: optionalString,
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  youtubeUrl: optionalUrl,
  seoDefaultTitle: optionalString,
  seoDefaultDescription: optionalString,
  logoUrl: z.string().nullable(),
  faviconUrl: z.string().nullable(),
});
export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;

/** Parses Json content with a schema, falling back to a safe default rather than throwing - CMS data must never crash the public site. */
export function parseContent<T>(schema: z.ZodType<T>, value: unknown, fallback: T): T {
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
}
