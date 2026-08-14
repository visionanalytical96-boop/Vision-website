import { z } from 'zod';
import {
  ServiceCallType,
  ServiceContractType,
  ServiceOutcome,
  ServiceReportKind,
} from '@/generated/prisma/enums';

/** Trims, and turns an empty box into `undefined` rather than an empty string. */
const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .optional();

const optionalId = optionalText.pipe(z.string().min(1).optional());

/** yyyy-mm-dd from a date input. Parsed as UTC so the printed date cannot drift a day. */
const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .optional()
  .pipe(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Use a valid date.' })
      .transform((value) => new Date(`${value}T00:00:00.000Z`))
      .optional(),
  );

export const serviceReportVisitLineSchema = z.object({
  visitedOn: optionalDate,
  timeIn: optionalText,
  timeOut: optionalText,
  systemConfiguration: optionalText,
  modelDescription: optionalText,
  systemNumber: optionalText,
});

export const serviceReportSchema = z.object({
  serviceRequestId: optionalId,
  visitId: optionalId,
  engineerId: z.string().trim().min(1, { error: 'Choose the engineer who attended.' }),
  companyId: optionalId,
  customerInstrumentId: optionalId,

  reportDate: optionalDate,
  companyName: z
    .string()
    .trim()
    .min(2, { error: 'Enter the customer company name.' }),
  companyAddress: optionalText,
  telephone: optionalText,
  contactPerson: optionalText,
  contactDesignation: optionalText,
  contactDepartment: optionalText,
  weekOff: optionalText,

  kind: z.enum(ServiceReportKind).default('INSPECTION'),
  outcome: z.enum(ServiceOutcome).optional(),
  serviceTypes: z.array(z.enum(ServiceCallType)).default([]),
  contractType: z.enum(ServiceContractType).optional(),

  faultReported: optionalText,
  workPerformed: z
    .string()
    .trim()
    .min(10, { error: 'Describe the observation and action taken (at least 10 characters).' }),
  partsSummary: optionalText,
  customerRemarks: optionalText,
  recommendations: optionalText,

  customerName: optionalText,
  customerDesignation: optionalText,
  engineerName: optionalText,
  signedAt: optionalDate,

  visitLines: z.array(serviceReportVisitLineSchema).default([]),
});

export type ServiceReportInput = z.infer<typeof serviceReportSchema>;

/** A row with nothing in it is a blank line on the form, not an error. */
export function isBlankVisitLine(line: z.infer<typeof serviceReportVisitLineSchema>): boolean {
  return (
    !line.visitedOn &&
    !line.timeIn &&
    !line.timeOut &&
    !line.systemConfiguration &&
    !line.modelDescription &&
    !line.systemNumber
  );
}
