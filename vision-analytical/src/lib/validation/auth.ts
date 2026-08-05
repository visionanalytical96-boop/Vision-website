import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email({ error: 'Enter a valid email address.' }).trim().toLowerCase(),
  password: z.string().min(1, { error: 'Password is required.' }),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, { error: 'Name must be at least 2 characters.' }),
    email: z.email({ error: 'Enter a valid email address.' }).trim().toLowerCase(),
    phone: z.string().trim().min(10, { error: 'Enter a valid phone number.' }).optional().or(z.literal('')),
    companyName: z.string().trim().optional().or(z.literal('')),
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

export type RegisterInput = z.infer<typeof registerSchema>;
