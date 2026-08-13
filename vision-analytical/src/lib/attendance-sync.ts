import 'server-only';
import { prisma } from '@/lib/db';
import { AttendanceSource, AttendanceStatus, LeaveRequestStatus } from '@/generated/prisma/enums';
import { deriveAttendance, type AttendancePolicy } from '@/lib/attendance';
import { type ParsedPunch } from '@/lib/punch-csv';
import { localDayKey, dayKeyToDate } from '@/lib/time-zone';

/**
 * Getting punches off the device and into attendance.
 *
 * Two halves, deliberately separate. Importing only writes raw punches, which
 * are append-only and deduplicated by the database. Processing folds them into
 * one row per person per day. Keeping them apart means a bad import can be
 * re-run, and a rule change can re-derive days without going back to the
 * hardware.
 */

export interface ImportResult {
  inserted: number;
  duplicates: number;
  unmatched: string[];
}

/**
 * Writes raw punches.
 *
 * `skipDuplicates` against the (biometricId, punchedAt) unique index is the
 * duplicate detection: re-importing an overlapping export, or a device
 * re-sending a window, cannot create a second row for the same scan.
 */
export async function importPunches(punches: ParsedPunch[], deviceId: string | null, note: string): Promise<ImportResult> {
  if (punches.length === 0) return { inserted: 0, duplicates: 0, unmatched: [] };

  const biometricIds = [...new Set(punches.map((punch) => punch.biometricId))];
  const employees = await prisma.employee.findMany({
    where: { biometricId: { in: biometricIds } },
    select: { id: true, biometricId: true },
  });
  const byBiometricId = new Map(employees.map((employee) => [employee.biometricId, employee.id]));

  const result = await prisma.attendancePunch.createMany({
    data: punches.map((punch) => ({
      deviceId,
      biometricId: punch.biometricId,
      punchedAt: punch.punchedAt,
      direction: punch.direction,
      // Left unmatched rather than dropped: an unknown device ID is usually a
      // real scan by someone whose employee record isn't mapped yet, and it
      // should stay visible until it is.
      employeeId: byBiometricId.get(punch.biometricId) ?? null,
      importNote: note,
    })),
    skipDuplicates: true,
  });

  return {
    inserted: result.count,
    duplicates: punches.length - result.count,
    unmatched: biometricIds.filter((id) => !byBiometricId.has(id)),
  };
}

export interface ProcessResult {
  daysWritten: number;
  punchesProcessed: number;
  skippedUnmatched: number;
}

/**
 * Folds unprocessed punches into one attendance row per person per day.
 *
 * Only days that have punches are touched, and rows that were entered by hand
 * are left alone - a manual correction is a decision someone made and signed
 * for, so a later sync must not quietly undo it.
 */
export async function processPunches(policy: AttendancePolicy): Promise<ProcessResult> {
  const pending = await prisma.attendancePunch.findMany({
    where: { processedAt: null },
    orderBy: { punchedAt: 'asc' },
    take: 5000,
  });
  if (pending.length === 0) return { daysWritten: 0, punchesProcessed: 0, skippedUnmatched: 0 };

  const matched = pending.filter((punch) => punch.employeeId !== null);
  const skippedUnmatched = pending.length - matched.length;

  // Group by employee and local day.
  const groups = new Map<string, { employeeId: string; dayKey: string; punchIds: string[]; punches: typeof matched }>();
  for (const punch of matched) {
    const dayKey = localDayKey(punch.punchedAt, policy.timezone);
    const key = `${punch.employeeId}|${dayKey}`;
    const group = groups.get(key);
    if (group) {
      group.punchIds.push(punch.id);
      group.punches.push(punch);
    } else {
      groups.set(key, {
        employeeId: punch.employeeId as string,
        dayKey,
        punchIds: [punch.id],
        punches: [punch],
      });
    }
  }

  const dates = [...new Set([...groups.values()].map((group) => group.dayKey))].map(dayKeyToDate);
  const [holidays, approvedLeave, existingRows] = await Promise.all([
    prisma.holiday.findMany({ where: { date: { in: dates } }, select: { date: true } }),
    prisma.leaveRequest.findMany({
      where: { status: LeaveRequestStatus.APPROVED },
      select: { employeeId: true, startDate: true, endDate: true },
    }),
    prisma.attendanceRecord.findMany({
      where: { OR: [...groups.values()].map((group) => ({ employeeId: group.employeeId, date: dayKeyToDate(group.dayKey) })) },
      select: { id: true, employeeId: true, date: true, source: true },
    }),
  ]);

  const holidayKeys = new Set(holidays.map((holiday) => holiday.date.toISOString().slice(0, 10)));
  const manualRows = new Set(
    existingRows
      .filter((row) => row.source === AttendanceSource.MANUAL)
      .map((row) => `${row.employeeId}|${row.date.toISOString().slice(0, 10)}`),
  );

  let daysWritten = 0;
  let punchesProcessed = 0;

  for (const group of groups.values()) {
    const date = dayKeyToDate(group.dayKey);
    const key = `${group.employeeId}|${group.dayKey}`;

    if (!manualRows.has(key)) {
      const onLeave = approvedLeave.some(
        (leave) => leave.employeeId === group.employeeId && leave.startDate <= date && leave.endDate >= date,
      );
      const derived = deriveAttendance({
        dayKey: group.dayKey,
        punches: group.punches,
        policy,
        isHoliday: holidayKeys.has(group.dayKey),
        isOnLeave: onLeave,
      });

      await prisma.attendanceRecord.upsert({
        where: { employeeId_date: { employeeId: group.employeeId, date } },
        update: { ...derived, source: AttendanceSource.BIOMETRIC },
        create: { employeeId: group.employeeId, date, ...derived, source: AttendanceSource.BIOMETRIC },
      });
      daysWritten += 1;
    }

    await prisma.attendancePunch.updateMany({
      where: { id: { in: group.punchIds } },
      data: { processedAt: new Date() },
    });
    punchesProcessed += group.punchIds.length;
  }

  return { daysWritten, punchesProcessed, skippedUnmatched };
}

/** A day that has punches but whose derived status says nobody was here. */
export function isSuspiciousDay(status: AttendanceStatus, workedMinutes: number): boolean {
  return status === AttendanceStatus.ABSENT && workedMinutes > 0;
}
