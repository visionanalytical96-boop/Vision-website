import { z } from 'zod';
import { ServiceRequestType, Priority } from '@/generated/prisma/client';

export const newServiceRequestSchema = z.object({
  type: z.enum(ServiceRequestType, { error: 'Choose a service type.' }),
  priority: z.enum(Priority, { error: 'Choose a priority.' }),
  instrumentDescription: z.string().trim().min(3, { error: 'Describe the instrument (model, serial number).' }),
  description: z.string().trim().min(10, { error: 'Describe the issue in a bit more detail.' }),
  amcContractId: z.string().trim().optional().or(z.literal('')),
});
