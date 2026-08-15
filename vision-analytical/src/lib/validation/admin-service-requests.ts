import { z } from 'zod';
import { ServiceRequestStatus } from '@/generated/prisma/client';

export const updateServiceRequestStatusSchema = z.object({
  requestId: z.string().trim().min(1),
  status: z.enum(ServiceRequestStatus, { error: 'Choose a status.' }),
});

export const assignEngineerSchema = z.object({
  requestId: z.string().trim().min(1),
  engineerId: z.string().trim().optional().or(z.literal('')),
});
