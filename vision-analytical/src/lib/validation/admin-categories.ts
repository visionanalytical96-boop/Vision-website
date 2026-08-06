import { z } from 'zod';
import { CategoryKind } from '@/generated/prisma/client';

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, { error: 'Name is required.' }),
  slug: z
    .string()
    .trim()
    .min(1, { error: 'Slug is required.' })
    .regex(/^[a-z0-9-]+$/, { error: 'Use lowercase letters, numbers and hyphens only.' }),
  kind: z.enum(CategoryKind, { error: 'Choose a category type.' }),
  description: z.string().trim().optional().or(z.literal('')),
  sortOrder: z.coerce.number().int().default(0),
});
