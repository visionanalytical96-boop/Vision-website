'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireRole, getCurrentUser } from '@/lib/dal';
import { formValues } from '@/lib/form-values';
import { recordAudit, diffFields } from '@/lib/audit';
import { deriveAttendance } from '@/lib/attendance';
import { getAttendancePolicy } from '@/lib/data/team';
import {
  dayKeyToDate,
  dateToDayKey,
  localWallClockToInstant,
  localMinutesOfDay,
  formatClockTime,
  parseClockTime,
} from '@/lib/time-zone';
import {
  employeeFormSchema,
  attendanceEntrySchema,
  departmentFormSchema,
  designationFormSchema,
  holidayFormSchema,
  leaveTypeFormSchema,
  attendanceRuleFormSchema,
  biometricDeviceFormSchema,
  leaveRequestFormSchema,
  type EmployeeFormInput,
} from '@/lib/validation/admin-team';
import { Role, AttendanceSource, AttendanceStatus, LeaveRequestStatus, PunchDirection } from '@/generated/prisma/client';

export interface TeamFormState {
  errors?: Record<string, string[] | undefined>;
  formError?: string;
  message?: string;
  /** Echoed back so a validation error doesn't wipe the form - see formValues. */
  values?: Record<string, string>;
}

/** Who is making the change, for the audit trail. */
async function actor(): Promise<{ id: string; label: string }> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return { id: user.id, label: `${user.name} (${user.email})` };
}

function revalidateTeam() {
  revalidatePath('/admin/team');
  revalidatePath('/admin/team/employees');
  revalidatePath('/admin/team/attendance');
  revalidatePath('/admin/team/activity');
}

function optional(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function optionalDate(value: string | undefined): Date | null {
  const trimmed = value?.trim();
  return trimmed ? dayKeyToDate(trimmed) : null;
}

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

function parseEmployee(formData: FormData) {
  return employeeFormSchema.safeParse({
    employeeCode: formData.get('employeeCode'),
    name: formData.get('name'),
    departmentId: String(formData.get('departmentId') ?? ''),
    designationId: String(formData.get('designationId') ?? ''),
    reportingToId: String(formData.get('reportingToId') ?? ''),
    userId: String(formData.get('userId') ?? ''),
    employmentType: formData.get('employmentType'),
    category: formData.get('category'),
    joiningDate: String(formData.get('joiningDate') ?? ''),
    exitDate: String(formData.get('exitDate') ?? ''),
    dateOfBirth: String(formData.get('dateOfBirth') ?? ''),
    mobile: String(formData.get('mobile') ?? ''),
    email: String(formData.get('email') ?? ''),
    emergencyContactName: String(formData.get('emergencyContactName') ?? ''),
    emergencyContactPhone: String(formData.get('emergencyContactPhone') ?? ''),
    addressLine: String(formData.get('addressLine') ?? ''),
    city: String(formData.get('city') ?? ''),
    state: String(formData.get('state') ?? ''),
    postalCode: String(formData.get('postalCode') ?? ''),
    biometricId: String(formData.get('biometricId') ?? ''),
    skills: String(formData.get('skills') ?? ''),
    notes: String(formData.get('notes') ?? ''),
    isActive: formData.get('isActive') === 'true',
  });
}

function employeeData(data: EmployeeFormInput) {
  return {
    employeeCode: data.employeeCode,
    name: data.name,
    departmentId: optional(data.departmentId),
    designationId: optional(data.designationId),
    reportingToId: optional(data.reportingToId),
    userId: optional(data.userId),
    employmentType: data.employmentType,
    category: data.category,
    joiningDate: dayKeyToDate(data.joiningDate),
    exitDate: optionalDate(data.exitDate),
    dateOfBirth: optionalDate(data.dateOfBirth),
    mobile: optional(data.mobile),
    email: optional(data.email),
    emergencyContactName: optional(data.emergencyContactName),
    emergencyContactPhone: optional(data.emergencyContactPhone),
    addressLine: optional(data.addressLine),
    city: optional(data.city),
    state: optional(data.state),
    postalCode: optional(data.postalCode),
    biometricId: optional(data.biometricId),
    skills: (data.skills ?? '')
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean),
    notes: optional(data.notes),
    isActive: data.isActive,
  };
}

/** Turns the two unique constraints into a message about the field that clashed. */
async function employeeClash(
  employeeCode: string,
  biometricId: string | null,
  userId: string | null,
  excludeId?: string,
): Promise<Record<string, string[]> | null> {
  const clashes = await prisma.employee.findMany({
    where: {
      OR: [
        { employeeCode },
        ...(biometricId ? [{ biometricId }] : []),
        ...(userId ? [{ userId }] : []),
      ],
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { employeeCode: true, biometricId: true, userId: true },
  });

  if (clashes.length === 0) return null;
  if (clashes.some((row) => row.employeeCode === employeeCode)) {
    return { employeeCode: ['Another employee already has this code.'] };
  }
  if (biometricId && clashes.some((row) => row.biometricId === biometricId)) {
    return { biometricId: ['Another employee is already mapped to this device ID.'] };
  }
  return { userId: ['That login is already linked to another employee.'] };
}

export async function createEmployee(
  _prevState: TeamFormState | undefined,
  formData: FormData,
): Promise<TeamFormState> {
  await requireRole(Role.ADMIN);

  const validated = parseEmployee(formData);
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, values: formValues(formData) };
  }
  const data = employeeData(validated.data);

  const clash = await employeeClash(data.employeeCode, data.biometricId, data.userId);
  if (clash) return { errors: clash, values: formValues(formData) };

  const who = await actor();
  const created = await prisma.$transaction(async (tx) => {
    const employee = await tx.employee.create({ data });
    await recordAudit(
      {
        actorId: who.id,
        actorLabel: who.label,
        action: 'employee.create',
        entityType: 'Employee',
        entityId: employee.id,
        summary: `Added employee ${employee.name} (${employee.employeeCode})`,
      },
      tx,
    );
    return employee;
  });

  revalidateTeam();
  redirect(`/admin/team/employees/${created.id}`);
}

export async function updateEmployee(
  id: string,
  _prevState: TeamFormState | undefined,
  formData: FormData,
): Promise<TeamFormState> {
  await requireRole(Role.ADMIN);

  const validated = parseEmployee(formData);
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, values: formValues(formData) };
  }
  const data = employeeData(validated.data);

  const clash = await employeeClash(data.employeeCode, data.biometricId, data.userId, id);
  if (clash) return { errors: clash, values: formValues(formData) };

  const before = await prisma.employee.findUnique({ where: { id } });
  if (!before) return { formError: 'That employee no longer exists.' };

  // Reporting to yourself is a loop the org chart can't draw.
  if (data.reportingToId === id) {
    return { errors: { reportingToId: ['An employee cannot report to themselves.'] }, values: formValues(formData) };
  }

  const who = await actor();
  await prisma.$transaction(async (tx) => {
    await tx.employee.update({ where: { id }, data });
    const changes = diffFields(before as unknown as Record<string, unknown>, data as unknown as Record<string, unknown>, {
      employeeCode: 'Employee code',
      departmentId: 'Department',
      designationId: 'Designation',
      reportingToId: 'Reports to',
      userId: 'Linked login',
      employmentType: 'Employment type',
      category: 'Category',
      joiningDate: 'Joining date',
      exitDate: 'Exit date',
      biometricId: 'Biometric ID',
      isActive: 'Active',
    });
    await recordAudit(
      {
        actorId: who.id,
        actorLabel: who.label,
        action: 'employee.update',
        entityType: 'Employee',
        entityId: id,
        summary: `Updated employee ${data.name} (${data.employeeCode})`,
        changes,
      },
      tx,
    );
  });

  revalidateTeam();
  redirect(`/admin/team/employees/${id}`);
}

/**
 * Employees are deactivated, not deleted.
 *
 * Their attendance history is a payroll record, and cascading it away to tidy
 * a list is how a year of someone's pay disappears.
 */
export async function setEmployeeActive(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  const id = String(formData.get('id'));
  const employee = await prisma.employee.findUnique({ where: { id }, select: { name: true, isActive: true } });
  if (!employee) return;

  const who = await actor();
  await prisma.$transaction(async (tx) => {
    await tx.employee.update({ where: { id }, data: { isActive: !employee.isActive } });
    await recordAudit(
      {
        actorId: who.id,
        actorLabel: who.label,
        action: employee.isActive ? 'employee.deactivate' : 'employee.activate',
        entityType: 'Employee',
        entityId: id,
        summary: `${employee.isActive ? 'Deactivated' : 'Reactivated'} ${employee.name}`,
      },
      tx,
    );
  });

  revalidateTeam();
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

/**
 * Creates or corrects one day's attendance by hand.
 *
 * The audit row is written in the same transaction as the change: an
 * attendance record is a claim about someone's pay, so an edit that leaves no
 * trace is worse than no edit at all. Times are entered as the office clock
 * reads and converted through the rule's zone.
 */
export async function saveAttendanceEntry(
  _prevState: TeamFormState | undefined,
  formData: FormData,
): Promise<TeamFormState> {
  await requireRole(Role.ADMIN);

  const validated = attendanceEntrySchema.safeParse({
    employeeId: formData.get('employeeId'),
    date: String(formData.get('date') ?? ''),
    checkIn: String(formData.get('checkIn') ?? ''),
    checkOut: String(formData.get('checkOut') ?? ''),
    status: formData.get('status'),
    notes: String(formData.get('notes') ?? ''),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, values: formValues(formData) };
  }
  const data = validated.data;

  const policy = await getAttendancePolicy();
  const date = dayKeyToDate(data.date);
  const checkInAt = data.checkIn ? localWallClockToInstant(data.date, parseClockTime(data.checkIn) ?? 0, policy.timezone) : null;
  const checkOutAt = data.checkOut
    ? localWallClockToInstant(data.date, parseClockTime(data.checkOut) ?? 0, policy.timezone)
    : null;

  const employee = await prisma.employee.findUnique({
    where: { id: data.employeeId },
    select: { name: true, employeeCode: true },
  });
  if (!employee) return { errors: { employeeId: ['That employee no longer exists.'] }, values: formValues(formData) };

  // Minutes come from the same engine the device sync uses, so a hand-entered
  // day and a scanned one are measured the same way.
  const derived =
    checkInAt !== null
      ? deriveAttendance({
          dayKey: data.date,
          punches: [
            { punchedAt: checkInAt, direction: PunchDirection.IN },
            ...(checkOutAt ? [{ punchedAt: checkOutAt, direction: PunchDirection.OUT }] : []),
          ],
          policy,
        })
      : null;

  const record = {
    checkInAt,
    checkOutAt,
    // The admin's chosen status wins over the derived one - correcting a
    // status is the main reason to open this form.
    status: data.status,
    workedMinutes: derived?.workedMinutes ?? 0,
    lateMinutes: derived?.lateMinutes ?? 0,
    overtimeMinutes: derived?.overtimeMinutes ?? 0,
    source: AttendanceSource.MANUAL,
    notes: data.notes,
  };

  const existing = await prisma.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId: data.employeeId, date } },
  });

  const who = await actor();
  await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.attendanceRecord.update({ where: { id: existing.id }, data: record });
      await recordAudit(
        {
          actorId: who.id,
          actorLabel: who.label,
          action: 'attendance.update',
          entityType: 'AttendanceRecord',
          entityId: existing.id,
          summary: `Corrected ${employee.name} on ${data.date}: ${existing.status} → ${record.status}`,
          changes: {
            ...diffFields(
              {
                status: existing.status,
                checkIn: existing.checkInAt ? formatClockTime(localMinutesOfDay(existing.checkInAt, policy.timezone)) : null,
                checkOut: existing.checkOutAt
                  ? formatClockTime(localMinutesOfDay(existing.checkOutAt, policy.timezone))
                  : null,
                source: existing.source,
              },
              {
                status: record.status,
                checkIn: checkInAt ? formatClockTime(localMinutesOfDay(checkInAt, policy.timezone)) : null,
                checkOut: checkOutAt ? formatClockTime(localMinutesOfDay(checkOutAt, policy.timezone)) : null,
                source: record.source,
              },
              { status: 'Status', checkIn: 'Check in', checkOut: 'Check out', source: 'Source' },
            ),
            Reason: { from: existing.notes ?? '—', to: data.notes },
          },
        },
        tx,
      );
    } else {
      const created = await tx.attendanceRecord.create({
        data: { employeeId: data.employeeId, date, ...record },
      });
      await recordAudit(
        {
          actorId: who.id,
          actorLabel: who.label,
          action: 'attendance.create',
          entityType: 'AttendanceRecord',
          entityId: created.id,
          summary: `Marked ${employee.name} ${record.status} on ${data.date} by hand`,
          changes: { Reason: { from: '—', to: data.notes } },
        },
        tx,
      );
    }
  });

  revalidateTeam();
  return { message: `Saved ${employee.name} for ${data.date}.` };
}

/**
 * Fills in a day for everyone who has no row yet.
 *
 * The gap between "nobody marked this" and "everyone was absent" is the whole
 * point: this closes it deliberately, on a day an admin names, and every row
 * it writes is logged.
 */
export async function markMissingAsAbsent(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  const dayKey = String(formData.get('date') ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return;

  const policy = await getAttendancePolicy();
  const date = dayKeyToDate(dayKey);

  const [employees, marked, holiday, approvedLeave] = await Promise.all([
    prisma.employee.findMany({ where: { isActive: true }, select: { id: true } }),
    prisma.attendanceRecord.findMany({ where: { date }, select: { employeeId: true } }),
    prisma.holiday.findFirst({ where: { date } }),
    prisma.leaveRequest.findMany({
      where: { status: LeaveRequestStatus.APPROVED, startDate: { lte: date }, endDate: { gte: date } },
      select: { employeeId: true },
    }),
  ]);

  const alreadyMarked = new Set(marked.map((row) => row.employeeId));
  const onLeave = new Set(approvedLeave.map((row) => row.employeeId));
  const missing = employees.filter((employee) => !alreadyMarked.has(employee.id));
  if (missing.length === 0) return;

  const status = holiday
    ? AttendanceStatus.HOLIDAY
    : policy.weeklyOffDays.includes(dayKeyToDate(dayKey).getUTCDay())
      ? AttendanceStatus.WEEKLY_OFF
      : AttendanceStatus.ABSENT;

  const who = await actor();
  await prisma.$transaction(async (tx) => {
    await tx.attendanceRecord.createMany({
      data: missing.map((employee) => ({
        employeeId: employee.id,
        date,
        status: onLeave.has(employee.id) ? AttendanceStatus.ON_LEAVE : status,
        source: AttendanceSource.MANUAL,
        notes: 'Filled in by the daily close.',
      })),
      skipDuplicates: true,
    });
    await recordAudit(
      {
        actorId: who.id,
        actorLabel: who.label,
        action: 'attendance.close_day',
        entityType: 'AttendanceRecord',
        entityId: dayKey,
        summary: `Closed ${dayKey}: filled ${missing.length} unmarked employee(s) as ${status}`,
      },
      tx,
    );
  });

  revalidateTeam();
}

// ---------------------------------------------------------------------------
// Departments and designations
// ---------------------------------------------------------------------------

export async function saveDepartment(
  id: string | null,
  _prevState: TeamFormState | undefined,
  formData: FormData,
): Promise<TeamFormState> {
  await requireRole(Role.ADMIN);

  const validated = departmentFormSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: String(formData.get('description') ?? ''),
    headId: String(formData.get('headId') ?? ''),
    sortOrder: String(formData.get('sortOrder') ?? '0'),
    isActive: formData.get('isActive') === 'true',
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, values: formValues(formData) };
  }
  const data = validated.data;

  const clash = await prisma.department.findFirst({
    where: { OR: [{ name: data.name }, { slug: data.slug }], ...(id ? { NOT: { id } } : {}) },
    select: { name: true },
  });
  if (clash) {
    return {
      errors: { slug: ['A department with that name or slug already exists.'] },
      values: formValues(formData),
    };
  }

  const payload = {
    name: data.name,
    slug: data.slug,
    description: optional(data.description),
    headId: optional(data.headId),
    sortOrder: data.sortOrder,
    isActive: data.isActive,
  };

  const who = await actor();
  await prisma.$transaction(async (tx) => {
    const saved = id
      ? await tx.department.update({ where: { id }, data: payload })
      : await tx.department.create({ data: payload });
    await recordAudit(
      {
        actorId: who.id,
        actorLabel: who.label,
        action: id ? 'department.update' : 'department.create',
        entityType: 'Department',
        entityId: saved.id,
        summary: `${id ? 'Updated' : 'Added'} department ${saved.name}`,
      },
      tx,
    );
  });

  revalidatePath('/admin/team/departments');
  revalidateTeam();
  redirect('/admin/team/departments');
}

export async function deleteDepartment(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  const id = String(formData.get('id'));
  const department = await prisma.department.findUnique({
    where: { id },
    select: { name: true, _count: { select: { employees: true } } },
  });
  if (!department) return;
  // Employees keep their record; the FK is SetNull, so nobody is deleted with
  // the department they happened to sit in.

  const who = await actor();
  await prisma.$transaction(async (tx) => {
    await tx.department.delete({ where: { id } });
    await recordAudit(
      {
        actorId: who.id,
        actorLabel: who.label,
        action: 'department.delete',
        entityType: 'Department',
        entityId: id,
        summary: `Deleted department ${department.name} (${department._count.employees} employee(s) unassigned)`,
      },
      tx,
    );
  });

  revalidatePath('/admin/team/departments');
}

export async function saveDesignation(
  _prevState: TeamFormState | undefined,
  formData: FormData,
): Promise<TeamFormState> {
  await requireRole(Role.ADMIN);

  const validated = designationFormSchema.safeParse({
    name: formData.get('name'),
    departmentId: String(formData.get('departmentId') ?? ''),
    sortOrder: String(formData.get('sortOrder') ?? '0'),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, values: formValues(formData) };
  }
  const data = validated.data;
  const departmentId = optional(data.departmentId);

  const clash = await prisma.designation.findFirst({ where: { name: data.name, departmentId } });
  if (clash) {
    return { errors: { name: ['That department already has this designation.'] }, values: formValues(formData) };
  }

  await prisma.designation.create({ data: { name: data.name, departmentId, sortOrder: data.sortOrder } });
  revalidatePath('/admin/team/departments');
  return { message: `Added ${data.name}.` };
}

export async function deleteDesignation(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  await prisma.designation.delete({ where: { id: String(formData.get('id')) } });
  revalidatePath('/admin/team/departments');
}

// ---------------------------------------------------------------------------
// Holidays and leave types
// ---------------------------------------------------------------------------

export async function saveHoliday(_prevState: TeamFormState | undefined, formData: FormData): Promise<TeamFormState> {
  await requireRole(Role.ADMIN);

  const validated = holidayFormSchema.safeParse({
    date: String(formData.get('date') ?? ''),
    name: formData.get('name'),
    isOptional: formData.get('isOptional') === 'true',
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, values: formValues(formData) };
  }
  const data = validated.data;

  const existing = await prisma.holiday.findUnique({
    where: { date_name: { date: dayKeyToDate(data.date), name: data.name } },
  });
  if (existing) {
    return { errors: { name: ['That holiday is already on the calendar.'] }, values: formValues(formData) };
  }

  await prisma.holiday.create({
    data: { date: dayKeyToDate(data.date), name: data.name, isOptional: data.isOptional },
  });
  revalidatePath('/admin/team/holidays');
  revalidateTeam();
  return { message: `Added ${data.name}.` };
}

export async function deleteHoliday(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  await prisma.holiday.delete({ where: { id: String(formData.get('id')) } });
  revalidatePath('/admin/team/holidays');
  revalidateTeam();
}

export async function saveLeaveType(
  id: string | null,
  _prevState: TeamFormState | undefined,
  formData: FormData,
): Promise<TeamFormState> {
  await requireRole(Role.ADMIN);

  const validated = leaveTypeFormSchema.safeParse({
    name: formData.get('name'),
    code: formData.get('code'),
    annualQuota: String(formData.get('annualQuota') ?? ''),
    isPaid: formData.get('isPaid') === 'true',
    requiresAttachment: formData.get('requiresAttachment') === 'true',
    sortOrder: String(formData.get('sortOrder') ?? '0'),
    isActive: formData.get('isActive') === 'true',
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, values: formValues(formData) };
  }
  const data = validated.data;

  const clash = await prisma.leaveType.findFirst({
    where: { OR: [{ name: data.name }, { code: data.code }], ...(id ? { NOT: { id } } : {}) },
  });
  if (clash) {
    return { errors: { code: ['A leave type with that name or code already exists.'] }, values: formValues(formData) };
  }

  const payload = {
    name: data.name,
    code: data.code,
    // Blank means uncapped, which is not the same as a quota of zero.
    annualQuota: data.annualQuota === '' || data.annualQuota === undefined ? null : Number(data.annualQuota),
    isPaid: data.isPaid,
    requiresAttachment: data.requiresAttachment,
    sortOrder: data.sortOrder,
    isActive: data.isActive,
  };

  if (id) {
    await prisma.leaveType.update({ where: { id }, data: payload });
  } else {
    await prisma.leaveType.create({ data: payload });
  }

  revalidatePath('/admin/team/leave');
  return { message: `Saved ${data.name}.` };
}

// ---------------------------------------------------------------------------
// Leave requests
// ---------------------------------------------------------------------------

export async function createLeaveRequest(
  _prevState: TeamFormState | undefined,
  formData: FormData,
): Promise<TeamFormState> {
  await requireRole(Role.ADMIN);

  const validated = leaveRequestFormSchema.safeParse({
    employeeId: formData.get('employeeId'),
    leaveTypeId: formData.get('leaveTypeId'),
    startDate: String(formData.get('startDate') ?? ''),
    endDate: String(formData.get('endDate') ?? ''),
    days: String(formData.get('days') ?? ''),
    reason: String(formData.get('reason') ?? ''),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, values: formValues(formData) };
  }
  const data = validated.data;

  await prisma.leaveRequest.create({
    data: {
      employeeId: data.employeeId,
      leaveTypeId: data.leaveTypeId,
      startDate: dayKeyToDate(data.startDate),
      endDate: dayKeyToDate(data.endDate),
      days: data.days,
      reason: data.reason,
    },
  });

  revalidatePath('/admin/team/leave');
  revalidateTeam();
  return { message: 'Leave request recorded.' };
}

/**
 * Approving leave writes the attendance rows for those days.
 *
 * Doing it here rather than at month end is what stops an approved absence
 * showing up in the register as an unexplained gap.
 */
export async function decideLeaveRequest(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  const id = String(formData.get('id'));
  const decision = String(formData.get('decision'));
  if (decision !== 'APPROVED' && decision !== 'REJECTED' && decision !== 'CANCELLED') return;

  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: { select: { name: true } }, leaveType: { select: { name: true } } },
  });
  if (!request) return;

  const who = await actor();
  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id },
      data: {
        status: decision as LeaveRequestStatus,
        decidedAt: new Date(),
        decisionNote: optional(String(formData.get('note') ?? '')),
      },
    });

    if (decision === 'APPROVED') {
      const days: Date[] = [];
      for (
        let cursor = new Date(request.startDate);
        cursor <= request.endDate && days.length < 366;
        cursor.setUTCDate(cursor.getUTCDate() + 1)
      ) {
        days.push(new Date(cursor));
      }

      for (const day of days) {
        await tx.attendanceRecord.upsert({
          where: { employeeId_date: { employeeId: request.employeeId, date: day } },
          // An existing row wins: if they actually turned up, an approved leave
          // request should not overwrite the fact that they were here.
          update: {},
          create: {
            employeeId: request.employeeId,
            date: day,
            status: AttendanceStatus.ON_LEAVE,
            source: AttendanceSource.MANUAL,
            notes: `${request.leaveType.name} approved`,
          },
        });
      }
    }

    await recordAudit(
      {
        actorId: who.id,
        actorLabel: who.label,
        action: `leave.${decision.toLowerCase()}`,
        entityType: 'LeaveRequest',
        entityId: id,
        summary: `${decision === 'APPROVED' ? 'Approved' : decision === 'REJECTED' ? 'Rejected' : 'Cancelled'} ${request.leaveType.name} for ${request.employee.name} (${dateToDayKey(request.startDate)} → ${dateToDayKey(request.endDate)})`,
      },
      tx,
    );
  });

  revalidatePath('/admin/team/leave');
  revalidateTeam();
}

// ---------------------------------------------------------------------------
// Attendance rule
// ---------------------------------------------------------------------------

export async function saveAttendanceRule(
  _prevState: TeamFormState | undefined,
  formData: FormData,
): Promise<TeamFormState> {
  await requireRole(Role.ADMIN);

  const validated = attendanceRuleFormSchema.safeParse({
    timezone: formData.get('timezone'),
    officeStartTime: formData.get('officeStartTime'),
    officeEndTime: formData.get('officeEndTime'),
    graceMinutes: String(formData.get('graceMinutes') ?? ''),
    halfDayAfterMinutes: String(formData.get('halfDayAfterMinutes') ?? ''),
    fullDayMinutes: String(formData.get('fullDayMinutes') ?? ''),
    halfDayMinutes: String(formData.get('halfDayMinutes') ?? ''),
    overtimeAfterMinutes: String(formData.get('overtimeAfterMinutes') ?? ''),
    weeklyOffDays: formData.getAll('weeklyOffDays').map(String),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, values: formValues(formData) };
  }
  const data = validated.data;

  const existing = await prisma.attendanceRule.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
  const who = await actor();

  await prisma.$transaction(async (tx) => {
    const saved = existing
      ? await tx.attendanceRule.update({ where: { id: existing.id }, data })
      : await tx.attendanceRule.create({ data });

    await recordAudit(
      {
        actorId: who.id,
        actorLabel: who.label,
        action: 'attendance_rule.update',
        entityType: 'AttendanceRule',
        entityId: saved.id,
        // Changing the policy changes how every future day is judged, so it
        // belongs in the same log as the attendance rows themselves.
        summary: 'Updated the attendance rules',
        changes: existing
          ? diffFields(existing as unknown as Record<string, unknown>, data as unknown as Record<string, unknown>, {
              timezone: 'Time zone',
              officeStartTime: 'Office starts',
              officeEndTime: 'Office ends',
              graceMinutes: 'Grace period',
              halfDayAfterMinutes: 'Half day after',
              fullDayMinutes: 'Full day',
              halfDayMinutes: 'Half day',
              overtimeAfterMinutes: 'Overtime after',
              weeklyOffDays: 'Weekly offs',
            })
          : undefined,
      },
      tx,
    );
  });

  revalidatePath('/admin/team/rules');
  revalidateTeam();
  return { message: 'Attendance rules saved. New days will be judged by these; days already recorded keep their numbers.' };
}

// ---------------------------------------------------------------------------
// Biometric devices
// ---------------------------------------------------------------------------

export async function saveBiometricDevice(
  id: string | null,
  _prevState: TeamFormState | undefined,
  formData: FormData,
): Promise<TeamFormState> {
  await requireRole(Role.ADMIN);

  const validated = biometricDeviceFormSchema.safeParse({
    name: formData.get('name'),
    model: formData.get('model'),
    host: formData.get('host'),
    port: String(formData.get('port') ?? ''),
    serialNumber: String(formData.get('serialNumber') ?? ''),
    isActive: formData.get('isActive') === 'true',
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, values: formValues(formData) };
  }
  const data = validated.data;

  const payload = {
    name: data.name,
    model: data.model,
    host: data.host,
    port: data.port,
    serialNumber: optional(data.serialNumber),
    isActive: data.isActive,
  };

  if (id) {
    await prisma.biometricDevice.update({ where: { id }, data: payload });
  } else {
    await prisma.biometricDevice.create({ data: payload });
  }

  revalidatePath('/admin/team/devices');
  return { message: `Saved ${data.name}.` };
}

export async function deleteBiometricDevice(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  // Punches survive: the FK is SetNull, because a scan happened whether or not
  // the device is still on the network.
  await prisma.biometricDevice.delete({ where: { id: String(formData.get('id')) } });
  revalidatePath('/admin/team/devices');
}

/**
 * Opens a TCP connection to the device and reports what happened.
 *
 * This is a reachability check, not a protocol handshake - it answers "is the
 * device on the network and listening", which is the question that is actually
 * wrong 90% of the time. Reading punch data needs the vendor's protocol; see
 * `syncBiometricDevice` for where that goes.
 */
/**
 * Test a device by actually talking to it.
 *
 * This used to open a socket and call that success. It is not: a web server,
 * a printer, or the wrong device entirely will all accept a connection on
 * that port, and an admin who sees "Reachable" reasonably assumes syncing
 * will work. Now it completes the protocol handshake and reads the serial
 * number back, so a pass means the thing at that address really is a
 * terminal that will answer commands.
 */
export async function testBiometricDevice(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  const id = String(formData.get('id'));
  const device = await prisma.biometricDevice.findUnique({ where: { id } });
  if (!device) return;

  const { probeDevice } = await import('@/lib/biometric/zk-client');
  const result = await probeDevice({ host: device.host, port: device.port });

  await prisma.biometricDevice.update({
    where: { id },
    data: {
      lastSyncOk: result.ok,
      lastSyncNote: result.message,
      lastSyncAt: new Date(),
      // The device is the authority on its own serial. Recording what it
      // reports means a swapped unit shows up as a changed serial rather
      // than silently syncing somebody else's attendance.
      ...(result.identity?.serialNumber ? { serialNumber: result.identity.serialNumber } : {}),
    },
  });

  revalidatePath('/admin/team/devices');
}

export interface DeviceScanState {
  error?: string;
  scanned?: string[];
  found?: Array<{ host: string; port: number; label: string }>;
}

/**
 * Sweep the networks this server is on, looking for terminals.
 *
 * Asking an admin to type the device address is where this usually goes
 * wrong: the address they know is the one printed on a sticker or configured
 * years ago, and the device has since been moved, re-addressed by DHCP, or
 * left on a subnet the server cannot reach. Scanning what the server is
 * actually connected to answers the real question — "can this machine see it,
 * and where".
 */
export async function scanForBiometricDevices(
  _prev: DeviceScanState | undefined,
  formData: FormData,
): Promise<DeviceScanState> {
  await requireRole(Role.ADMIN);

  const { discoverDevices, localSubnetPrefixes } = await import('@/lib/biometric/zk-client');

  // The app runs in a container, so its own interfaces are Docker's bridge
  // network (172.x) and never the LAN the device is on. Scanning only those
  // searched a network no terminal could ever be on and reported "nothing
  // found", which reads as "the device is off" rather than "we looked in the
  // wrong place". An explicit subnet is therefore the primary input, and the
  // container's own networks are only the fallback.
  const typed = String(formData.get('subnet') ?? '').trim();
  let prefixes: string[];

  if (typed) {
    const match = typed.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\.\d{1,3})?$/);
    if (!match) {
      return { error: 'Enter the first three parts of the address, like 192.168.1' };
    }
    const octets = [match[1], match[2], match[3]].map(Number);
    if (octets.some((octet) => octet > 255)) {
      return { error: `${typed} is not a valid address range.` };
    }
    prefixes = [octets.join('.')];
  } else {
    prefixes = await localSubnetPrefixes();
    if (prefixes.length === 0) {
      return { error: 'This server is not on a network it can scan. Type the range instead, like 192.168.1' };
    }
  }

  const results = await Promise.all(prefixes.map((prefix) => discoverDevices(prefix)));
  const found = results.flat().map((device) => ({
    host: device.host,
    port: device.port,
    label: device.message,
  }));

  return { scanned: prefixes.map((prefix) => `${prefix}.1-254`), found };
}

/**
 * Imports a punch log exported from the device.
 *
 * This is the working path today. Pulling records over the wire needs the
 * vendor's binary protocol, which cannot be written honestly without the
 * hardware in front of you to test against - see the note in
 * `docs/attendance-devices.md`. A CSV export off the device's own software
 * produces the same rows, through the same parser and the same duplicate
 * detection, so nothing downstream has to change when that adapter lands.
 */
export async function importPunchCsv(
  _prevState: TeamFormState | undefined,
  formData: FormData,
): Promise<TeamFormState> {
  await requireRole(Role.ADMIN);

  const file = formData.get('file');
  const deviceId = optional(String(formData.get('deviceId') ?? ''));
  if (!(file instanceof File) || file.size === 0) {
    return { errors: { file: ['Choose a CSV file exported from the device.'] } };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { errors: { file: ['That file is larger than 8MB. Export a shorter date range.'] } };
  }

  const { parsePunchCsv } = await import('@/lib/punch-csv');
  const { importPunches, processPunches } = await import('@/lib/attendance-sync');
  const policy = await getAttendancePolicy();
  const parsed = parsePunchCsv(await file.text(), policy.timezone);

  if (parsed.punches.length === 0) {
    return {
      errors: {
        file: [
          parsed.errors.length > 0
            ? `No usable rows. First problem: line ${parsed.errors[0].line} — ${parsed.errors[0].reason}`
            : 'That file had no rows in it.',
        ],
      },
    };
  }

  const imported = await importPunches(parsed.punches, deviceId, `CSV import: ${file.name}`);
  const processed = await processPunches(policy);

  const who = await actor();
  await recordAudit({
    actorId: who.id,
    actorLabel: who.label,
    action: 'attendance.import',
    entityType: 'AttendancePunch',
    entityId: deviceId ?? 'csv',
    summary: `Imported ${imported.inserted} punch(es) from ${file.name}; wrote ${processed.daysWritten} attendance day(s)`,
  });

  if (deviceId) {
    await prisma.biometricDevice.update({
      where: { id: deviceId },
      data: {
        lastSyncAt: new Date(),
        lastSyncOk: true,
        lastSyncNote: `Imported ${imported.inserted} punch(es) from ${file.name}`,
      },
    });
  }

  revalidateTeam();
  revalidatePath('/admin/team/devices');

  const notes = [
    `${imported.inserted} punch(es) imported`,
    imported.duplicates > 0 ? `${imported.duplicates} already present` : null,
    `${processed.daysWritten} attendance day(s) written`,
    parsed.errors.length > 0 ? `${parsed.errors.length} line(s) unreadable` : null,
    imported.unmatched.length > 0
      ? `${imported.unmatched.length} device ID(s) not mapped to anyone: ${imported.unmatched.slice(0, 5).join(', ')}`
      : null,
  ].filter(Boolean);

  return { message: notes.join(' · ') };
}

/** Re-runs the fold for punches that arrived before their employee was mapped. */
export async function processPendingPunches(): Promise<void> {
  await requireRole(Role.ADMIN);
  const { processPunches } = await import('@/lib/attendance-sync');
  const policy = await getAttendancePolicy();

  // Late mapping: a punch imported before the employee had a biometric ID sits
  // unmatched forever unless it is re-linked when the mapping appears.
  const unmatched = await prisma.attendancePunch.findMany({
    where: { employeeId: null, processedAt: null },
    select: { id: true, biometricId: true },
  });
  if (unmatched.length > 0) {
    const employees = await prisma.employee.findMany({
      where: { biometricId: { in: [...new Set(unmatched.map((punch) => punch.biometricId))] } },
      select: { id: true, biometricId: true },
    });
    for (const employee of employees) {
      await prisma.attendancePunch.updateMany({
        where: { employeeId: null, biometricId: employee.biometricId as string },
        data: { employeeId: employee.id },
      });
    }
  }

  await processPunches(policy);
  revalidateTeam();
  revalidatePath('/admin/team/devices');
}
