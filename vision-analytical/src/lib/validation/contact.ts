import { z } from 'zod';

export const contactMessageSchema = z.object({
  name: z.string().trim().min(2, { error: 'Enter your name.' }),
  email: z.email({ error: 'Enter a valid email address.' }).trim(),
  phone: z.string().trim().optional().or(z.literal('')),
  subject: z.string().trim().optional().or(z.literal('')),
  message: z.string().trim().min(10, { error: 'Tell us a bit more (at least 10 characters).' }),
});
