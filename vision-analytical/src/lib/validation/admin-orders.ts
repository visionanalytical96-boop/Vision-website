import { z } from 'zod';
import { OrderStatus, InvoiceStatus } from '@/generated/prisma/client';

export const updateOrderStatusSchema = z.object({
  orderId: z.string().trim().min(1),
  status: z.enum(OrderStatus, { error: 'Choose a status.' }),
});

export const createInvoiceSchema = z.object({
  orderId: z.string().trim().min(1),
  status: z.enum(InvoiceStatus, { error: 'Choose a status.' }),
  dueInDays: z.coerce.number().int().min(0).default(15),
});
