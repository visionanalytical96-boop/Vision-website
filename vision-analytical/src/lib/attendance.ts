import { AttendanceStatus, PunchDirection } from '@/generated/prisma/enums';
import { localMinutesOfDay, dayKeyWeekday, parseClockTime } from '@/lib/time-zone';

/**
 * The attendance policy, as the engine needs it. A structural type rather than
 * the Prisma model so this stays pure and testable, and so a caller can pass a
 * draft rule from a settings form that hasn't been saved yet.
 */
export interface AttendancePolicy {
  timezone: string;
  officeStartTime: string;
  officeEndTime: string;
  graceMinutes: number;
  halfDayAfterMinutes: number;
  fullDayMinutes: number;
  halfDayMinutes: number;
  overtimeAfterMinutes: number;
  weeklyOffDays: number[];
}

export interface PunchLike {
  punchedAt: Date;
  direction: PunchDirection;
}

export interface DerivedAttendance {
  checkInAt: Date | null;
  checkOutAt: Date | null;
  status: AttendanceStatus;
  workedMinutes: number;
  lateMinutes: number;
  overtimeMinutes: number;
}

export interface DeriveInput {
  dayKey: string;
  punches: PunchLike[];
  policy: AttendancePolicy;
  isHoliday?: boolean;
  isOnLeave?: boolean;
}

export function isWeeklyOff(dayKey: string, policy: AttendancePolicy): boolean {
  return policy.weeklyOffDays.includes(dayKeyWeekday(dayKey));
}

/**
 * Total minutes between paired IN and OUT punches.
 *
 * Devices that record a direction let us deduct a mid-day exit properly. A
 * device that just records a scan reports UNKNOWN, and then the only honest
 * reading is first-to-last - which counts a two-hour lunch trip as worked. The
 * fallback is deliberate, not an oversight: inventing pairs from alternating
 * scans would silently halve a day for anyone who scanned twice on the way in.
 */
function workedMinutesFromPunches(sorted: PunchLike[]): number {
  const directional = sorted.filter((punch) => punch.direction !== PunchDirection.UNKNOWN);
  const hasBothDirections =
    directional.some((punch) => punch.direction === PunchDirection.IN) &&
    directional.some((punch) => punch.direction === PunchDirection.OUT);

  if (!hasBothDirections) {
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    return Math.max(0, Math.round((last.punchedAt.getTime() - first.punchedAt.getTime()) / 60000));
  }

  let total = 0;
  let openedAt: Date | null = null;
  for (const punch of directional) {
    if (punch.direction === PunchDirection.IN) {
      // Consecutive INs: keep the first, so a double-scan on the way in
      // doesn't shorten the day.
      openedAt ??= punch.punchedAt;
    } else if (openedAt) {
      total += Math.max(0, Math.round((punch.punchedAt.getTime() - openedAt.getTime()) / 60000));
      openedAt = null;
    }
  }
  return total;
}

/**
 * Turns one day's punches into one attendance row.
 *
 * Every number it returns is stored on the row rather than recomputed on read,
 * so changing the policy next quarter cannot rewrite a month payroll has
 * already paid.
 */
export function deriveAttendance({ dayKey, punches, policy, isHoliday, isOnLeave }: DeriveInput): DerivedAttendance {
  const sorted = [...punches].sort((a, b) => a.punchedAt.getTime() - b.punchedAt.getTime());
  const dayOff = isHoliday === true || isWeeklyOff(dayKey, policy);

  if (sorted.length === 0) {
    let status: AttendanceStatus = AttendanceStatus.ABSENT;
    if (isOnLeave === true) status = AttendanceStatus.ON_LEAVE;
    else if (isHoliday === true) status = AttendanceStatus.HOLIDAY;
    else if (isWeeklyOff(dayKey, policy)) status = AttendanceStatus.WEEKLY_OFF;
    return { checkInAt: null, checkOutAt: null, status, workedMinutes: 0, lateMinutes: 0, overtimeMinutes: 0 };
  }

  const checkInAt = sorted[0].punchedAt;
  const checkOutAt = sorted.length > 1 ? sorted[sorted.length - 1].punchedAt : null;
  const workedMinutes = workedMinutesFromPunches(sorted);

  // Someone who came in on a holiday or their weekly off was still off that
  // day as far as the calendar is concerned - the day keeps its status, the
  // hours are recorded, and all of them count as overtime.
  if (dayOff) {
    return {
      checkInAt,
      checkOutAt,
      status: isHoliday === true ? AttendanceStatus.HOLIDAY : AttendanceStatus.WEEKLY_OFF,
      workedMinutes,
      lateMinutes: 0,
      overtimeMinutes: workedMinutes,
    };
  }

  const startMinutes = parseClockTime(policy.officeStartTime) ?? 0;
  const arrivedAt = localMinutesOfDay(checkInAt, policy.timezone);
  const lateMinutes = Math.max(0, arrivedAt - startMinutes - policy.graceMinutes);
  const overtimeMinutes = Math.max(0, workedMinutes - policy.overtimeAfterMinutes);

  let status: AttendanceStatus;
  if (workedMinutes >= policy.fullDayMinutes) {
    status = lateMinutes > 0 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
  } else if (workedMinutes >= policy.halfDayMinutes) {
    status = AttendanceStatus.HALF_DAY;
  } else {
    // Present but under the half-day threshold. The row still carries the real
    // minutes, so the record stays truthful even though the day doesn't count.
    status = AttendanceStatus.ABSENT;
  }

  // Arriving very late costs the day even if the hours were made up later.
  if (lateMinutes > policy.halfDayAfterMinutes && status !== AttendanceStatus.ABSENT) {
    status = AttendanceStatus.HALF_DAY;
  }

  return { checkInAt, checkOutAt, status, workedMinutes, lateMinutes, overtimeMinutes };
}

/** Statuses that count as the person having turned up. */
export const PRESENT_STATUSES = [
  AttendanceStatus.PRESENT,
  AttendanceStatus.LATE,
  AttendanceStatus.HALF_DAY,
] as const;

/**
 * How much of a working day the person actually worked.
 *
 * Attendance only - not pay. Paid leave is worth a day in payroll but zero
 * here, because whether it's paid lives on the leave type, and folding the two
 * together is how an attendance total quietly becomes a wrong salary.
 */
export function daysWorked(status: AttendanceStatus): number {
  switch (status) {
    case AttendanceStatus.PRESENT:
    case AttendanceStatus.LATE:
      return 1;
    case AttendanceStatus.HALF_DAY:
      return 0.5;
    case AttendanceStatus.ON_LEAVE:
    case AttendanceStatus.HOLIDAY:
    case AttendanceStatus.WEEKLY_OFF:
    case AttendanceStatus.ABSENT:
      return 0;
  }
}
