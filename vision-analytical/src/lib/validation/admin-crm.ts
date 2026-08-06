import { z } from 'zod';
import { CrmLeadStatus, CrmActivityType } from '@/generated/prisma/client';

export const createLeadSchema = z.object({
  name: z.string().trim().min(2, { error: 'Enter the lead name.' }),
  company: z.string().trim().optional().or(z.literal('')),
  email: z.email({ error: 'Enter a valid email address.' }).trim().optional().or(z.literal('')),
  phone: z.string().trim().optional().or(z.literal('')),
  source: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
  assignedToId: z.string().trim().optional().or(z.literal('')),
});

export const updateLeadStatusSchema = z.object({
  leadId: z.string().trim().min(1),
  status: z.enum(CrmLeadStatus, { error: 'Choose a status.' }),
});

export const assignLeadSchema = z.object({
  leadId: z.string().trim().min(1),
  assignedToId: z.string().trim().optional().or(z.literal('')),
});

export const logActivitySchema = z.object({
  leadId: z.string().trim().min(1),
  type: z.enum(CrmActivityType, { error: 'Choose an activity type.' }),
  notes: z.string().trim().min(1, { error: 'Enter a note describing the activity.' }),
});
