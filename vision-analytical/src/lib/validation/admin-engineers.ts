import { z } from 'zod';

export const createEngineerSchema = z
  .object({
    name: z.string().trim().min(2, { error: 'Name must be at least 2 characters.' }),
    email: z.email({ error: 'Enter a valid email address.' }).trim().toLowerCase(),
    phone: z.string().trim().min(10, { error: 'Enter a valid phone number.' }).optional().or(z.literal('')),
    password: z
      .string()
      .min(8, { error: 'Password must be at least 8 characters.' })
      .regex(/[a-zA-Z]/, { error: 'Password must contain at least one letter.' })
      .regex(/[0-9]/, { error: 'Password must contain at least one number.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: 'Passwords do not match.',
    path: ['confirmPassword'],
  });
