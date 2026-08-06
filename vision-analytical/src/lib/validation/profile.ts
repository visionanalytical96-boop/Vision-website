import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, { error: 'Name must be at least 2 characters.' }),
  phone: z.string().trim().min(10, { error: 'Enter a valid phone number.' }).optional().or(z.literal('')),
  companyName: z.string().trim().optional().or(z.literal('')),
});
