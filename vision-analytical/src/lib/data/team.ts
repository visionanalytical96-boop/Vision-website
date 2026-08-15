import 'server-only';
import { cache } from 'react';
import { prisma } from '@/lib/db';
import { AttendanceStatus, LeaveRequestStatus, StaffCategory } from '@/generated/prisma/enums';
import type { AttendancePolicy } from '@/lib/attendance';
import { daysWorked, isWeeklyOff } from '@/lib/attendance';
import { dayKeyToDate, dateToDayKey, todayDayKey, addDays, dayKeyRange } from '@/lib/time-zone';

/**
 * The policy every attendance calculation reads.
 *
 * Falls back to coded defaults when no rule row exists so the module works on
 * a fresh install - an unseeded settings table should never be an outage.
 */
export const getAttendancePolicy = cache(async (): Promise<AttendancePolicy & { id: string | null }> => {
  const rule = await prisma.attendanceRule.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!rule) {
    return {
      id: null,
      timezone: 'Asia/Kolkata',
      officeStartTime: '09:30',
      officeEndTime: '18:30',
      graceMinutes: 10,
      halfDayAfterMinutes: 120,
      fullDayMinutes: 480,
      halfDayMinutes: 240,
      overtimeAfterMinutes: 540,
      weeklyOffDays: [0],
    };
  }

  return {
    id: rule.id,
    timezone: rule.timezone,
    officeStartTime: rule.officeStartTime,
    officeEndTime: rule.officeEndTime,
    graceMinutes: rule.graceMinutes,
    halfDayAfterMinutes: rule.halfDayAfterMinutes,
    fullDayMinutes: rule.fullDayMinutes,
    halfDayMinutes: rule.halfDayMinutes,
    overtimeAfterMinutes: rule.overtimeAfterMinutes,
    weeklyOffDays: rule.weeklyOffDays,
  };
});

/** Today, in the office's own time zone rather than the server's. */
export async function getToday(): Promise<string> {
  const policy = await getAttendancePolicy();
  return todayDayKey(policy.timezone);
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface TeamDashboard {
  dayKey: string;
  isDayOff: boolean;
  holidayName: string | null;
  headcount: { total: number; office: number; field: number };
  today: {
    present: number;
    late: number;
    halfDay: number;
    absent: number;
    onLeave: number;
    notMarked: number;
  };
  pendingLeave: number;
  devices: { total: number; online: number; lastSyncAt: Date | null };
  unprocessedPunches: number;
  upcomingHolidays: Array<{ id: string; date: Date; name: string; isOptional: boolean }>;
  onLeaveToday: Array<{ id: string; name: string; leaveType: string }>;
  recentEdits: Array<{ id: string; actorLabel: string; summary: string; createdAt: Date }>;
}

export async function getTeamDashboard(): Promise<TeamDashboard> {
  const policy = await getAttendancePolicy();
  const dayKey = todayDayKey(policy.timezone);
  const date = dayKeyToDate(dayKey);

  const [byCategory, statusCounts, holiday, pendingLeave, devices, unprocessedPunches, upcomingHolidays, onLeave, recentEdits] =
    await Promise.all([
      prisma.employee.groupBy({ by: ['category'], where: { isActive: true }, _count: { _all: true } }),
      prisma.attendanceRecord.groupBy({
        by: ['status'],
        where: { date, employee: { isActive: true } },
        _count: { _all: true },
      }),
      prisma.holiday.findFirst({ where: { date } }),
      prisma.leaveRequest.count({ where: { status: LeaveRequestStatus.PENDING } }),
      prisma.biometricDevice.findMany({
        where: { isActive: true },
        select: { id: true, lastSyncOk: true, lastSyncAt: true },
      }),
      prisma.attendancePunch.count({ where: { processedAt: null } }),
      prisma.holiday.findMany({ where: { date: { gte: date } }, orderBy: { date: 'asc' }, take: 4 }),
      prisma.leaveRequest.findMany({
        where: {
          status: LeaveRequestStatus.APPROVED,
          startDate: { lte: date },
          endDate: { gte: date },
        },
        select: { id: true, employee: { select: { name: true } }, leaveType: { select: { name: true } } },
        take: 12,
      }),
      prisma.auditLog.findMany({
        where: { entityType: 'AttendanceRecord' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, actorLabel: true, summary: true, createdAt: true },
      }),
    ]);

  const countOf = (status: AttendanceStatus) =>
    statusCounts.find((row) => row.status === status)?._count._all ?? 0;

  const office = byCategory.find((row) => row.category === StaffCategory.OFFICE_STAFF)?._count._all ?? 0;
  const field = byCategory.find((row) => row.category === StaffCategory.FIELD_ENGINEER)?._count._all ?? 0;
  const total = office + field;
  const marked = statusCounts.reduce((sum, row) => sum + row._count._all, 0);

  return {
    dayKey,
    isDayOff: holiday !== null || isWeeklyOff(dayKey, policy),
    holidayName: holiday?.name ?? null,
    headcount: { total, office, field },
    today: {
      present: countOf(AttendanceStatus.PRESENT),
      late: countOf(AttendanceStatus.LATE),
      halfDay: countOf(AttendanceStatus.HALF_DAY),
      absent: countOf(AttendanceStatus.ABSENT),
      onLeave: countOf(AttendanceStatus.ON_LEAVE),
      notMarked: Math.max(0, total - marked),
    },
    pendingLeave,
    devices: {
      total: devices.length,
      online: devices.filter((device) => device.lastSyncOk === true).length,
      lastSyncAt: devices.reduce<Date | null>(
        (latest, device) =>
          device.lastSyncAt && (!latest || device.lastSyncAt > latest) ? device.lastSyncAt : latest,
        null,
      ),
    },
    unprocessedPunches,
    upcomingHolidays,
    onLeaveToday: onLeave.map((request) => ({
      id: request.id,
      name: request.employee.name,
      leaveType: request.leaveType.name,
    })),
    recentEdits,
  };
}

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

export interface EmployeeFilters {
  q?: string;
  department?: string;
  category?: string;
  status?: string;
}

export async function getEmployees(filters: EmployeeFilters = {}) {
  const query = filters.q?.trim();
  const category = filters.category && filters.category in StaffCategory ? (filters.category as StaffCategory) : undefined;

  return prisma.employee.findMany({
    where: {
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' as const } },
              { employeeCode: { contains: query, mode: 'insensitive' as const } },
              { mobile: { contains: query, mode: 'insensitive' as const } },
              { email: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(filters.department ? { department: { slug: filters.department } } : {}),
      ...(category ? { category } : {}),
      ...(filters.status === 'inactive' ? { isActive: false } : filters.status === 'all' ? {} : { isActive: true }),
    },
    include: {
      department: { select: { name: true, slug: true } },
      designation: { select: { name: true } },
      reportingTo: { select: { id: true, name: true } },
    },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
  });
}

export type EmployeeListItem = Awaited<ReturnType<typeof getEmployees>>[number];

export async function getEmployeeById(id: string) {
  return prisma.employee.findUnique({
    where: { id },
    include: {
      department: true,
      designation: true,
      reportingTo: { select: { id: true, name: true, employeeCode: true } },
      directReports: { select: { id: true, name: true, employeeCode: true }, orderBy: { name: 'asc' } },
      user: { select: { id: true, email: true, role: true } },
      documents: { orderBy: { createdAt: 'desc' } },
    },
  });
}

/** The last `days` of attendance for one employee, newest first. */
export async function getEmployeeAttendance(employeeId: string, days = 30) {
  const policy = await getAttendancePolicy();
  const from = dayKeyToDate(addDays(todayDayKey(policy.timezone), -(days - 1)));

  return prisma.attendanceRecord.findMany({
    where: { employeeId, date: { gte: from } },
    orderBy: { date: 'desc' },
  });
}

export async function getEmployeeLeave(employeeId: string) {
  return prisma.leaveRequest.findMany({
    where: { employeeId },
    include: { leaveType: { select: { name: true, code: true } } },
    orderBy: { startDate: 'desc' },
    take: 20,
  });
}

/** Employees that can be picked in a select. Active only - you don't assign work to a leaver. */
export const getEmployeeOptions = cache(async () => {
  return prisma.employee.findMany({
    where: { isActive: true },
    select: { id: true, name: true, employeeCode: true },
    orderBy: { name: 'asc' },
  });
});

/**
 * Accounts not already tied to an employee, so the picker can't offer a link
 * the unique constraint would then reject.
 */
export async function getLinkableUsers(currentUserId?: string | null) {
  return prisma.user.findMany({
    where: {
      isActive: true,
      OR: [{ employeeProfile: { is: null } }, ...(currentUserId ? [{ id: currentUserId }] : [])],
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  });
}

// ---------------------------------------------------------------------------
// Attendance register
// ---------------------------------------------------------------------------

export interface AttendanceFilters {
  from?: string;
  to?: string;
  employeeId?: string;
  department?: string;
  status?: string;
}

export interface AttendanceRange {
  from: string;
  to: string;
}

/** Defaults to the current month so the page opens on something useful. */
export async function resolveAttendanceRange(filters: AttendanceFilters): Promise<AttendanceRange> {
  const today = await getToday();
  const monthStart = `${today.slice(0, 7)}-01`;
  const from = filters.from?.trim() || monthStart;
  const to = filters.to?.trim() || today;
  return from <= to ? { from, to } : { from: to, to: from };
}

export async function getAttendanceRegister(filters: AttendanceFilters, range: AttendanceRange) {
  const status = filters.status && filters.status in AttendanceStatus ? (filters.status as AttendanceStatus) : undefined;

  return prisma.attendanceRecord.findMany({
    where: {
      date: { gte: dayKeyToDate(range.from), lte: dayKeyToDate(range.to) },
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(status ? { status } : {}),
      ...(filters.department ? { employee: { department: { slug: filters.department } } } : {}),
    },
    include: {
      employee: {
        select: { id: true, name: true, employeeCode: true, department: { select: { name: true } } },
      },
    },
    orderBy: [{ date: 'desc' }, { employee: { name: 'asc' } }],
    // A month for a whole company is a few hundred rows; the cap keeps a
    // mistyped year range from trying to render a decade.
    take: 1000,
  });
}

export type AttendanceRow = Awaited<ReturnType<typeof getAttendanceRegister>>[number];

export function getAttendanceTotals(rows: AttendanceRow[]) {
  return rows.reduce(
    (totals, row) => ({
      days: totals.days + daysWorked(row.status),
      workedMinutes: totals.workedMinutes + row.workedMinutes,
      lateMinutes: totals.lateMinutes + row.lateMinutes,
      overtimeMinutes: totals.overtimeMinutes + row.overtimeMinutes,
    }),
    { days: 0, workedMinutes: 0, lateMinutes: 0, overtimeMinutes: 0 },
  );
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface MonthlyReportRow {
  employeeId: string;
  employeeCode: string;
  name: string;
  department: string;
  present: number;
  late: number;
  halfDay: number;
  absent: number;
  onLeave: number;
  daysWorked: number;
  workedMinutes: number;
  overtimeMinutes: number;
}

/**
 * One row per employee for a month.
 *
 * Grouped in the database rather than in memory: a year of a growing company
 * is the case this has to survive, and pulling every row back to count them
 * is what makes an HR report time out.
 */
export async function getMonthlyReport(month: string): Promise<{ rows: MonthlyReportRow[]; workingDays: number }> {
  const policy = await getAttendancePolicy();
  const from = `${month}-01`;
  // Day 0 of the next month is the last day of this one, which handles both
  // February and leap years without a table of month lengths.
  const lastDay = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;

  const [employees, grouped, holidays] = await Promise.all([
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, name: true, employeeCode: true, department: { select: { name: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.attendanceRecord.groupBy({
      by: ['employeeId', 'status'],
      where: { date: { gte: dayKeyToDate(from), lte: dayKeyToDate(monthEnd) } },
      _count: { _all: true },
      _sum: { workedMinutes: true, overtimeMinutes: true },
    }),
    prisma.holiday.findMany({
      where: { date: { gte: dayKeyToDate(from), lte: dayKeyToDate(monthEnd) }, isOptional: false },
      select: { date: true },
    }),
  ]);

  const holidayKeys = new Set(holidays.map((holiday) => dateToDayKey(holiday.date)));
  const workingDays = dayKeyRange(from, monthEnd).filter(
    (key) => !isWeeklyOff(key, policy) && !holidayKeys.has(key),
  ).length;

  const rows = employees.map((employee) => {
    const mine = grouped.filter((row) => row.employeeId === employee.id);
    const countOf = (status: AttendanceStatus) =>
      mine.find((row) => row.status === status)?._count._all ?? 0;

    return {
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      name: employee.name,
      department: employee.department?.name ?? '—',
      present: countOf(AttendanceStatus.PRESENT),
      late: countOf(AttendanceStatus.LATE),
      halfDay: countOf(AttendanceStatus.HALF_DAY),
      absent: countOf(AttendanceStatus.ABSENT),
      onLeave: countOf(AttendanceStatus.ON_LEAVE),
      daysWorked: mine.reduce((sum, row) => sum + daysWorked(row.status) * row._count._all, 0),
      workedMinutes: mine.reduce((sum, row) => sum + (row._sum.workedMinutes ?? 0), 0),
      overtimeMinutes: mine.reduce((sum, row) => sum + (row._sum.overtimeMinutes ?? 0), 0),
    };
  });

  return { rows, workingDays };
}

// ---------------------------------------------------------------------------
// Settings and reference data
// ---------------------------------------------------------------------------

export async function getDepartments() {
  return prisma.department.findMany({
    include: {
      head: { select: { id: true, name: true } },
      _count: { select: { employees: true, designations: true } },
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export async function getDesignations() {
  return prisma.designation.findMany({
    include: { department: { select: { name: true } }, _count: { select: { employees: true } } },
    orderBy: [{ department: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export const getDepartmentOptions = cache(async () => {
  return prisma.department.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
});

export const getDesignationOptions = cache(async () => {
  return prisma.designation.findMany({
    where: { isActive: true },
    select: { id: true, name: true, departmentId: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
});

export async function getHolidays(year?: number) {
  const target = year ?? new Date().getUTCFullYear();
  return prisma.holiday.findMany({
    where: {
      date: { gte: new Date(Date.UTC(target, 0, 1)), lte: new Date(Date.UTC(target, 11, 31)) },
    },
    orderBy: { date: 'asc' },
  });
}

export async function getHolidayYears(): Promise<number[]> {
  const rows = await prisma.holiday.findMany({ select: { date: true }, orderBy: { date: 'asc' } });
  const years = new Set(rows.map((row) => row.date.getUTCFullYear()));
  years.add(new Date().getUTCFullYear());
  return [...years].sort((a, b) => b - a);
}

export async function getLeaveTypes() {
  return prisma.leaveType.findMany({
    include: { _count: { select: { requests: true } } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export const getLeaveTypeOptions = cache(async () => {
  return prisma.leaveType.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
});

export async function getLeaveRequests(status?: string) {
  const parsed = status && status in LeaveRequestStatus ? (status as LeaveRequestStatus) : undefined;
  return prisma.leaveRequest.findMany({
    where: parsed ? { status: parsed } : {},
    include: {
      employee: { select: { id: true, name: true, employeeCode: true, department: { select: { name: true } } } },
      leaveType: { select: { name: true, code: true, isPaid: true } },
      decidedBy: { select: { name: true } },
    },
    orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    take: 200,
  });
}

export async function getBiometricDevices() {
  return prisma.biometricDevice.findMany({
    include: { _count: { select: { punches: true } } },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
  });
}

export async function getAttendanceRule() {
  return prisma.attendanceRule.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
}

/** Punches that haven't been folded into a day yet - the failed-record view. */
export async function getUnprocessedPunches(limit = 100) {
  return prisma.attendancePunch.findMany({
    where: { processedAt: null },
    include: { device: { select: { name: true } }, employee: { select: { name: true } } },
    orderBy: { punchedAt: 'desc' },
    take: limit,
  });
}

// ---------------------------------------------------------------------------
// Activity log
// ---------------------------------------------------------------------------

export interface ActivityFilters {
  entityType?: string;
  action?: string;
  q?: string;
}

export async function getActivityLog(filters: ActivityFilters = {}, limit = 200) {
  const query = filters.q?.trim();
  return prisma.auditLog.findMany({
    where: {
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(query
        ? {
            OR: [
              { summary: { contains: query, mode: 'insensitive' as const } },
              { actorLabel: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getActivityEntityTypes(): Promise<string[]> {
  const rows = await prisma.auditLog.groupBy({ by: ['entityType'], orderBy: { entityType: 'asc' } });
  return rows.map((row) => row.entityType);
}
