import { z } from 'zod';
import { AmcType, AmcStatus } from '@/generated/prisma/client';

export const createAmcContractSchema = z
  .object({
    customerId: z.string().trim().min(1, { error: 'Choose a customer.' }),
    type: z.enum(AmcType, { error: 'Choose a contract type.' }),
    instrumentDescription: z.string().trim().min(3, { error: 'Describe the instrument (model, serial number).' }),
    startDate: z.coerce.date({ error: 'Enter a valid start date.' }),
    endDate: z.coerce.date({ error: 'Enter a valid end date.' }),
    visitsIncluded: z.coerce.number().int().min(1, { error: 'Include at least one visit.' }),
    priceRupees: z.string().trim().optional().or(z.literal('')),
  })
  .refine((data) => data.endDate > data.startDate, {
    error: 'End date must be after the start date.',
    path: ['endDate'],
  });

export const updateAmcStatusSchema = z.object({
  contractId: z.string().trim().min(1),
  status: z.enum(AmcStatus, { error: 'Choose a status.' }),
});
