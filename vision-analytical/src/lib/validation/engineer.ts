import { z } from 'zod';
import { ServiceRequestStatus } from '@/generated/prisma/client';

// Engineers move a job through ASSIGNED -> IN_PROGRESS -> COMPLETED. Only
// admins can CLOSE (after confirming/invoicing) or CANCEL a request.
const ENGINEER_SETTABLE_STATUSES = [ServiceRequestStatus.ASSIGNED, ServiceRequestStatus.IN_PROGRESS, ServiceRequestStatus.COMPLETED] as const;

export const updateJobStatusSchema = z.object({
  jobId: z.string().trim().min(1),
  status: z.enum(ENGINEER_SETTABLE_STATUSES, { error: 'Choose a status.' }),
});

export const submitServiceReportSchema = z.object({
  jobId: z.string().trim().min(1),
  workPerformed: z.string().trim().min(10, { error: 'Describe the work performed (at least 10 characters).' }),
  partsUsed: z.string().trim().optional().or(z.literal('')),
});
