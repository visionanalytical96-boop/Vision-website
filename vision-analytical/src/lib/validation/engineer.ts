import { z } from 'zod';

export const submitServiceReportSchema = z.object({
  jobId: z.string().trim().min(1),
  workPerformed: z.string().trim().min(10, { error: 'Describe the work performed (at least 10 characters).' }),
  partsUsed: z.string().trim().optional().or(z.literal('')),
});
