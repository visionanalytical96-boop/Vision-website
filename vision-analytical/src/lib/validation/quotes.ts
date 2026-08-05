import { z } from 'zod';

export const quoteContactSchema = z.object({
  contactName: z.string().trim().min(2, { error: 'Enter your name.' }),
  contactEmail: z.email({ error: 'Enter a valid email address.' }).trim(),
  contactPhone: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
});

export const cartItemSchema = z.object({
  kind: z.enum(['PRODUCT', 'REFURBISHED']),
  id: z.string(),
  name: z.string(),
  quantity: z.coerce.number().int().positive(),
});

export const cartItemsSchema = z.array(cartItemSchema).min(1, { error: 'Your cart is empty.' });
