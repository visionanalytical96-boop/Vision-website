// Import from the pure-data enums module, not the client module - the latter
// has Node-only top-level imports that break any client component this ends up
// bundled into.
import {
  AttendanceStatus,
  AttendanceSource,
  EmploymentType,
  StaffCategory,
  LeaveRequestStatus,
  EmployeeDocumentKind,
  PunchDirection,
} from '@/generated/prisma/enums';
import type { BadgeTone } from '@/components/ui/Badge';

export interface LabelMeta {
  label: string;
  tone: BadgeTone;
}

export const attendanceStatusMeta: Record<AttendanceStatus, LabelMeta> = {
  PRESENT: { label: 'Present', tone: 'success' },
  LATE: { label: 'Late', tone: 'warning' },
  HALF_DAY: { label: 'Half day', tone: 'warning' },
  ABSENT: { label: 'Absent', tone: 'danger' },
  ON_LEAVE: { label: 'On leave', tone: 'info' },
  WEEKLY_OFF: { label: 'Weekly off', tone: 'neutral' },
  HOLIDAY: { label: 'Holiday', tone: 'neutral' },
};

export const attendanceSourceMeta: Record<AttendanceSource, string> = {
  BIOMETRIC: 'Biometric',
  MANUAL: 'Manual',
  IMPORT: 'Imported',
};

export const employmentTypeMeta: Record<EmploymentType, string> = {
  FULL_TIME: 'Full time',
  PART_TIME: 'Part time',
  CONTRACT: 'Contract',
  INTERN: 'Intern',
};

export const staffCategoryMeta: Record<StaffCategory, string> = {
  OFFICE_STAFF: 'Office staff',
  FIELD_ENGINEER: 'Field engineer',
};

export const leaveRequestStatusMeta: Record<LeaveRequestStatus, LabelMeta> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

export const employeeDocumentKindMeta: Record<EmployeeDocumentKind, string> = {
  ID_PROOF: 'ID proof',
  OFFER_LETTER: 'Offer letter',
  EXPERIENCE: 'Experience letter',
  CERTIFICATE: 'Certificate',
  CONTRACT: 'Contract',
  OTHER: 'Other',
};

export const punchDirectionMeta: Record<PunchDirection, string> = {
  IN: 'In',
  OUT: 'Out',
  UNKNOWN: 'Scan',
};

export const ATTENDANCE_STATUSES = Object.keys(attendanceStatusMeta) as AttendanceStatus[];
export const EMPLOYMENT_TYPES = Object.keys(employmentTypeMeta) as EmploymentType[];
export const STAFF_CATEGORIES = Object.keys(staffCategoryMeta) as StaffCategory[];
export const LEAVE_REQUEST_STATUSES = Object.keys(leaveRequestStatusMeta) as LeaveRequestStatus[];
export const EMPLOYEE_DOCUMENT_KINDS = Object.keys(employeeDocumentKindMeta) as EmployeeDocumentKind[];

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** 0 = Sunday, matching `weeklyOffDays` and JavaScript's getDay(). */
export function weekdayName(day: number): string {
  return WEEKDAY_NAMES[day] ?? String(day);
}

export const WEEKDAYS = WEEKDAY_NAMES.map((name, index) => ({ value: index, name }));
