import { z } from 'zod';
import { QuoteStatus } from '@/generated/prisma/client';

export const setQuoteStatusSchema = z.object({
  quoteId: z.string().trim().min(1),
  status: z.enum(QuoteStatus, { error: 'Choose a status.' }),
});

export const convertQuoteSchema = z.object({
  quoteId: z.string().trim().min(1),
  line1: z.string().trim().min(3, { error: 'Enter the address.' }),
  city: z.string().trim().min(1, { error: 'Enter the city.' }),
  state: z.string().trim().min(1, { error: 'Enter the state.' }),
  postalCode: z.string().trim().min(1, { error: 'Enter the postal code.' }),
});
