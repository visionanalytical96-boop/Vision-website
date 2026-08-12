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
  brandId: z.string().trim().optional().or(z.literal('')),
  description: z.string().trim().min(10, { error: 'Add a short description (at least 10 characters).' }),
  priceRupees: z.string().trim().optional().or(z.literal('')),
  stockStatus: z.enum(StockStatus, { error: 'Choose a stock status.' }),
  stockQuantity: z.coerce.number().int().min(0).default(0),
  isPublished: z.boolean(),
  seoTitle: z.string().trim().optional().or(z.literal('')),
  seoDescription: z.string().trim().optional().or(z.literal('')),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;

/**
 * Compatibility and specifications post as JSON alongside the flat fields,
 * because both are repeaters whose length isn't known to the form.
 */
export const compatibilityRowSchema = z.object({
  brandId: z.string().trim().min(1, { error: 'Choose a brand for every compatibility row.' }),
  // Empty means "fits this brand generally".
  instrumentModelId: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null)),
  note: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null)),
});

export const compatibilityListSchema = z.array(compatibilityRowSchema);

export const specificationRowSchema = z.object({
  group: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null)),
  label: z.string().trim().min(1, { error: 'Every specification needs a label.' }),
  value: z.string().trim().min(1, { error: 'Every specification needs a value.' }),
  unit: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null)),
});

// Blank rows are the editor's "add row" placeholder, not data.
export const specificationListSchema = z.array(
  z.object({ group: z.string(), label: z.string(), value: z.string(), unit: z.string() }),
).transform((rows) => rows.filter((row) => row.label.trim() !== '' || row.value.trim() !== ''));

export const instrumentModelFormSchema = z.object({
  brandId: z.string().trim().min(1, { error: 'Choose a brand.' }),
  name: z.string().trim().min(1, { error: 'Model name is required.' }),
  slug: z
    .string()
    .trim()
    .min(1, { error: 'Slug is required.' })
    .regex(/^[a-z0-9-]+$/, { error: 'Use lowercase letters, numbers and hyphens only.' }),
  categoryId: z.string().trim().optional().or(z.literal('')),
  description: z.string().trim().optional().or(z.literal('')),
  isPublished: z.boolean(),
  sortOrder: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? Number(value) : 0))
    .refine((value) => Number.isInteger(value), { error: 'Sort order must be a whole number.' }),
});

export type InstrumentModelFormInput = z.infer<typeof instrumentModelFormSchema>;
