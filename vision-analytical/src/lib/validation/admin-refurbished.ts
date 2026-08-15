import { z } from 'zod';
import { RefurbishedCondition, StockStatus } from '@/generated/prisma/client';

export const refurbishedFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, { error: 'Slug is required.' })
    .regex(/^[a-z0-9-]+$/, { error: 'Use lowercase letters, numbers and hyphens only.' }),
  name: z.string().trim().min(2, { error: 'Name is required.' }),
  categoryId: z.string().trim().min(1, { error: 'Choose a category.' }),
  brandId: z.string().trim().min(1, { error: 'Choose a brand.' }),
  model: z.string().trim().optional().or(z.literal('')),
  condition: z.enum(RefurbishedCondition, { error: 'Choose a condition.' }),
  includedAccessories: z.string().trim().optional().or(z.literal('')),
  warrantyMonths: z.coerce.number().int().min(0),
  demoVideoUrl: z.string().trim().optional().or(z.literal('')),
  description: z.string().trim().min(10, { error: 'Add a short description (at least 10 characters).' }),
  priceRupees: z.string().trim().optional().or(z.literal('')),
  stockStatus: z.enum(StockStatus, { error: 'Choose a stock status.' }),
  isPublished: z.boolean(),
});
