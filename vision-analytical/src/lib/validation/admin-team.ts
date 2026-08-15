import { z } from 'zod';
import {
  AttendanceStatus,
  EmploymentType,
  StaffCategory,
  LeaveRequestStatus,
  EmployeeDocumentKind,
} from '@/generated/prisma/enums';
import { isValidTimeZone, parseClockTime } from '@/lib/time-zone';

const optionalText = z.string().trim().optional().or(z.literal(''));

/** "2026-08-13" from a native date input. */
const dayKey = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Choose a date.' })
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), { error: 'That date does not exist.' });

const optionalDayKey = dayKey.optional().or(z.literal(''));

/** "09:30" from a native time input. */
const clockTime = z
  .string()
  .trim()
  .refine((value) => parseClockTime(value) !== null, { error: 'Use a 24-hour time like 09:30.' });

const optionalClockTime = clockTime.optional().or(z.literal(''));

const positiveMinutes = z.coerce
  .number({ error: 'Enter a number of minutes.' })
  .int({ error: 'Use whole minutes.' })
  .min(0, { error: 'Cannot be negative.' })
  .max(1440, { error: 'Cannot be more than a full day.' });

export const employeeFormSchema = z.object({
  employeeCode: z
    .string()
    .trim()
    .min(2, { error: 'Employee code must be at least 2 characters.' })
    .max(32, { error: 'Employee code is too long.' }),
  name: z.string().trim().min(2, { error: 'Name must be at least 2 characters.' }),
  departmentId: optionalText,
  designationId: optionalText,
  reportingToId: optionalText,
  userId: optionalText,
  employmentType: z.enum(EmploymentType, { error: 'Choose an employment type.' }),
  category: z.enum(StaffCategory, { error: 'Choose a staff category.' }),
  joiningDate: dayKey,
  exitDate: optionalDayKey,
  dateOfBirth: optionalDayKey,
  mobile: optionalText,
  email: z.union([z.email({ error: 'Enter a valid email address.' }), z.literal('')]).optional(),
  emergencyContactName: optionalText,
  emergencyContactPhone: optionalText,
  addressLine: optionalText,
  city: optionalText,
  state: optionalText,
  postalCode: optionalText,
  biometricId: optionalText,
  skills: optionalText,
  notes: optionalText,
  isActive: z.boolean(),
});

export type EmployeeFormInput = z.infer<typeof employeeFormSchema>;

/**
 * A manual attendance row. Check-in and check-out are wall-clock times on the
 * chosen day - the action turns them into instants using the rule's zone, so
 * what an admin types is what the office clock said.
 */
export const attendanceEntrySchema = z
  .object({
    employeeId: z.string().trim().min(1, { error: 'Choose an employee.' }),
    date: dayKey,
    checkIn: optionalClockTime,
    checkOut: optionalClockTime,
    status: z.enum(AttendanceStatus, { error: 'Choose a status.' }),
    notes: z.string().trim().min(3, { error: 'Say why this row was entered by hand.' }),
  })
  .refine(
    (data) => {
      if (!data.checkIn || !data.checkOut) return true;
      const start = parseClockTime(data.checkIn);
      const end = parseClockTime(data.checkOut);
      return start === null || end === null || end >= start;
    },
    { error: 'Check-out cannot be before check-in.', path: ['checkOut'] },
  );

export const departmentFormSchema = z.object({
  name: z.string().trim().min(2, { error: 'Name must be at least 2 characters.' }),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: 'Use lowercase letters, numbers and hyphens.' }),
  description: optionalText,
  headId: optionalText,
  sortOrder: z.coerce.number({ error: 'Enter a number.' }).int().min(0).max(999).default(0),
  isActive: z.boolean(),
});

export const designationFormSchema = z.object({
  name: z.string().trim().min(2, { error: 'Name must be at least 2 characters.' }),
  departmentId: optionalText,
  sortOrder: z.coerce.number({ error: 'Enter a number.' }).int().min(0).max(999).default(0),
});

export const holidayFormSchema = z.object({
  date: dayKey,
  name: z.string().trim().min(2, { error: 'Name the holiday.' }),
  isOptional: z.boolean(),
});

export const leaveTypeFormSchema = z.object({
  name: z.string().trim().min(2, { error: 'Name must be at least 2 characters.' }),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, { error: 'Use a short code like CL.' })
    .max(8, { error: 'Keep the code under 8 characters.' }),
  // Blank means uncapped, which is different from zero days.
  annualQuota: z
    .union([z.coerce.number({ error: 'Enter a number of days.' }).int().min(0).max(365), z.literal('')])
    .optional(),
  isPaid: z.boolean(),
  requiresAttachment: z.boolean(),
  sortOrder: z.coerce.number({ error: 'Enter a number.' }).int().min(0).max(999).default(0),
  isActive: z.boolean(),
});

export const attendanceRuleFormSchema = z
  .object({
    timezone: z.string().trim().refine(isValidTimeZone, { error: 'Not a time zone this server knows.' }),
    officeStartTime: clockTime,
    officeEndTime: clockTime,
    graceMinutes: positiveMinutes,
    halfDayAfterMinutes: positiveMinutes,
    fullDayMinutes: positiveMinutes,
    halfDayMinutes: positiveMinutes,
    overtimeAfterMinutes: positiveMinutes,
    weeklyOffDays: z.array(z.coerce.number().int().min(0).max(6)),
  })
  .refine((data) => data.halfDayMinutes <= data.fullDayMinutes, {
    error: 'A half day cannot be longer than a full day.',
    path: ['halfDayMinutes'],
  })
  .refine(
    (data) => {
      const start = parseClockTime(data.officeStartTime);
      const end = parseClockTime(data.officeEndTime);
      return start === null || end === null || end > start;
    },
    { error: 'The office day has to end after it starts.', path: ['officeEndTime'] },
  );

export const biometricDeviceFormSchema = z.object({
  name: z.string().trim().min(2, { error: 'Name the device, e.g. "Front gate".' }),
  model: z.string().trim().min(2, { error: 'Enter the device model.' }),
  host: z
    .string()
    .trim()
    .min(3, { error: 'Enter the device IP address or hostname.' })
    // Deliberately not restricted to an IP: these sit on a LAN and are as often
    // reached by hostname as by address.
    .max(255, { error: 'That hostname is too long.' }),
  port: z.coerce
    .number({ error: 'Enter a port number.' })
    .int({ error: 'Ports are whole numbers.' })
    .min(1, { error: 'Enter a port between 1 and 65535.' })
    .max(65535, { error: 'Enter a port between 1 and 65535.' }),
  serialNumber: optionalText,
  isActive: z.boolean(),
});

export const leaveRequestFormSchema = z
  .object({
    employeeId: z.string().trim().min(1, { error: 'Choose an employee.' }),
    leaveTypeId: z.string().trim().min(1, { error: 'Choose a leave type.' }),
    startDate: dayKey,
    endDate: dayKey,
    days: z.coerce
      .number({ error: 'Enter the number of days.' })
      .min(0.5, { error: 'Leave is at least half a day.' })
      .max(365, { error: 'That is longer than a year.' }),
    reason: z.string().trim().min(3, { error: 'Give a reason.' }),
  })
  .refine((data) => data.endDate >= data.startDate, {
    error: 'The end date cannot be before the start date.',
    path: ['endDate'],
  });

export const leaveDecisionSchema = z.object({
  status: z.enum(LeaveRequestStatus, { error: 'Choose a decision.' }),
  decisionNote: optionalText,
});

export const employeeDocumentSchema = z.object({
  kind: z.enum(EmployeeDocumentKind, { error: 'Choose a document type.' }),
  title: z.string().trim().min(2, { error: 'Give the document a title.' }),
  fileUrl: z.string().trim().min(1, { error: 'Attach a file.' }),
  issuedOn: optionalDayKey,
  expiresOn: optionalDayKey,
});
