import { z } from 'zod';
import { BlogCategory, ContentStatus } from '@/generated/prisma/client';

export const blogPostFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, { error: 'Slug is required.' })
    .regex(/^[a-z0-9-]+$/, { error: 'Use lowercase letters, numbers and hyphens only.' }),
  title: z.string().trim().min(2, { error: 'Title is required.' }),
  category: z.enum(BlogCategory, { error: 'Choose a category.' }),
  excerpt: z.string().trim().min(10, { error: 'Add a short excerpt (at least 10 characters).' }),
  content: z.string().trim().min(50, { error: 'Add the full article content (at least 50 characters).' }),
  status: z.enum(ContentStatus, { error: 'Choose a status.' }),
  // datetime-local posts "YYYY-MM-DDTHH:mm" with no zone, which Date reads as
  // local time - the same clock the admin just typed in.
  publishAt: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? new Date(value) : null))
    .refine((value) => value === null || !Number.isNaN(value.getTime()), { error: 'Enter a valid date and time.' }),
  reviewNote: z.string().trim().optional().or(z.literal('')),
  seoTitle: z.string().trim().optional().or(z.literal('')),
  seoDescription: z.string().trim().optional().or(z.literal('')),
});

export type BlogPostFormInput = z.infer<typeof blogPostFormSchema>;
