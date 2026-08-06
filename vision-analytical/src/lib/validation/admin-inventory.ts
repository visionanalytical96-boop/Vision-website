import { z } from 'zod';
import { StockMovementType } from '@/generated/prisma/client';

export const stockMovementFormSchema = z.object({
  productId: z.string().trim().min(1),
  type: z.enum(StockMovementType, { error: 'Choose a movement type.' }),
  quantity: z.coerce.number().int().refine((n) => n !== 0, { error: 'Quantity cannot be zero.' }),
  note: z.string().trim().optional().or(z.literal('')),
});

export const supplierFormSchema = z.object({
  name: z.string().trim().min(2, { error: 'Name is required.' }),
  contactName: z.string().trim().optional().or(z.literal('')),
  email: z.string().trim().optional().or(z.literal('')),
  phone: z.string().trim().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
});
