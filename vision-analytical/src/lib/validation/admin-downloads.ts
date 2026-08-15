import { z } from 'zod';
import { DownloadKind } from '@/generated/prisma/client';

const optionalText = z.string().trim().optional().or(z.literal(''));

export const downloadFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, { error: 'Slug is required.' })
    .regex(/^[a-z0-9-]+$/, { error: 'Use lowercase letters, numbers and hyphens only.' }),
  title: z.string().trim().min(2, { error: 'Title is required.' }),
  description: optionalText,
  kind: z.enum(DownloadKind, { error: 'Choose a document type.' }),
  // Either a path served by this site or a link to the manufacturer's copy.
  fileUrl: z
    .string()
    .trim()
    .min(1, { error: 'A file URL is required.' })
    .refine((value) => value.startsWith('/') || /^https?:\/\//i.test(value), {
      error: 'Use a path starting with / or a full http(s) URL.',
    }),
  fileType: optionalText,
  fileSizeBytes: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? Number(value) : null))
    .refine((value) => value === null || (Number.isInteger(value) && value >= 0), {
      error: 'File size must be a whole number of bytes.',
    }),
  brandId: optionalText,
  categoryId: optionalText,
  productId: optionalText,
  requiresLogin: z.boolean(),
  isPublished: z.boolean(),
  sortOrder: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? Number(value) : 0))
    .refine((value) => Number.isInteger(value), { error: 'Sort order must be a whole number.' }),
});

export type DownloadFormInput = z.infer<typeof downloadFormSchema>;

export const testimonialFormSchema = z.object({
  quote: z.string().trim().min(20, { error: 'Add the testimonial itself (at least 20 characters).' }),
  authorName: z.string().trim().min(2, { error: "The person's name is required." }),
  authorTitle: optionalText,
  company: optionalText,
  isPublished: z.boolean(),
  sortOrder: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? Number(value) : 0))
    .refine((value) => Number.isInteger(value), { error: 'Sort order must be a whole number.' }),
});

export type TestimonialFormInput = z.infer<typeof testimonialFormSchema>;
