import { z } from 'zod';
import { ContentStatus, ArticleKind } from '@/generated/prisma/client';
import { toVideoEmbedUrl } from '@/lib/video-embed';

export const blogPostFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, { error: 'Slug is required.' })
    .regex(/^[a-z0-9-]+$/, { error: 'Use lowercase letters, numbers and hyphens only.' }),
  title: z.string().trim().min(2, { error: 'Title is required.' }),
  // Optional: an article can be filed before anyone decides its subject area.
  topicId: z.string().trim().optional().or(z.literal('')),
  tags: z.string().trim().optional().or(z.literal('')),
  reviewerId: z.string().trim().optional().or(z.literal('')),
  kind: z.enum(ArticleKind, { error: 'Choose an article type.' }),
  errorCode: z.string().trim().optional().or(z.literal('')),
  // Normalised to the embeddable form, and rejected when it isn't a host the
  // CSP allows - saving it otherwise renders an empty box with no explanation.
  // Refine before transform: afterwards "empty" and "unusable" are both null
  // and no longer tell apart, so the check has to see the raw string.
  videoUrl: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || toVideoEmbedUrl(value) !== null, {
      error: 'Enter a YouTube or Vimeo link — other hosts are blocked by the site security policy.',
    })
    .transform((value) => (value ? toVideoEmbedUrl(value) : null)),
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

/** One row of "what this article is about". */
export const articleLinkSchema = z.object({
  brandId: z.string().trim(),
  instrumentModelId: z.string().trim(),
  productId: z.string().trim(),
});

export const articleLinkListSchema = z.array(articleLinkSchema);
