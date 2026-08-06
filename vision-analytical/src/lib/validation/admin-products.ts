import { z } from 'zod';
import { ProductKind, StockStatus } from '@/generated/prisma/client';

export const productFormSchema = z.object({
  sku: z.string().trim().min(1, { error: 'SKU is required.' }),
  slug: z
    .string()
    .trim()
    .min(1, { error: 'Slug is required.' })
    .regex(/^[a-z0-9-]+$/, { error: 'Use lowercase letters, numbers and hyphens only.' }),
  name: z.string().trim().min(2, { error: 'Name is required.' }),
  kind: z.enum(ProductKind, { error: 'Choose a product type.' }),
  categoryId: z.string().trim().min(1, { error: 'Choose a category.' }),
  brand: z.string().trim().optional().or(z.literal('')),
  compatibleBrands: z.string().trim().optional().or(z.literal('')),
  description: z.string().trim().min(10, { error: 'Add a short description (at least 10 characters).' }),
  priceRupees: z.string().trim().optional().or(z.literal('')),
  stockStatus: z.enum(StockStatus, { error: 'Choose a stock status.' }),
  stockQuantity: z.coerce.number().int().min(0).default(0),
  isPublished: z.boolean(),
  seoTitle: z.string().trim().optional().or(z.literal('')),
  seoDescription: z.string().trim().optional().or(z.literal('')),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;
