import { z } from 'zod';

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

/** Parses Json content with a schema, falling back to a safe default rather than throwing - CMS data must never crash the public site. */
export function parseContent<T>(schema: z.ZodType<T>, value: unknown, fallback: T): T {
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
}
