import { z } from 'zod';
import { BlogCategory } from '@/generated/prisma/client';

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
  isPublished: z.boolean(),
  seoTitle: z.string().trim().optional().or(z.literal('')),
  seoDescription: z.string().trim().optional().or(z.literal('')),
});

export type BlogPostFormInput = z.infer<typeof blogPostFormSchema>;
