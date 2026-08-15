import { z } from 'zod';

export const quoteContactSchema = z.object({
  contactName: z.string().trim().min(2, { error: 'Enter your name.' }),
  contactEmail: z.email({ error: 'Enter a valid email address.' }).trim(),
  contactPhone: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
});

/**
 * CUSTOM covers a line the visitor typed themselves on /request-quote - there
 * is no catalogue row behind it, which QuoteItem already allows since both its
 * product relations are optional.
 */
export const cartItemSchema = z
  .object({
    kind: z.enum(['PRODUCT', 'REFURBISHED', 'CUSTOM']),
    id: z.string().optional(),
    name: z.string().trim().min(1, { error: 'Describe what you need.' }),
    quantity: z.coerce.number().int().positive(),
  })
  .refine((item) => item.kind === 'CUSTOM' || Boolean(item.id), {
    error: 'Catalogue items must reference a product.',
    path: ['id'],
  });

export const cartItemsSchema = z.array(cartItemSchema).min(1, { error: 'Your cart is empty.' });
