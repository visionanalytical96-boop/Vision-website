import type { NextRequest } from 'next/server';
import { requireRole } from '@/lib/dal';
import { Role } from '@/generated/prisma/client';
import { getAttendanceRegister, resolveAttendanceRange, getAttendancePolicy } from '@/lib/data/team';
import { attendanceStatusMeta, attendanceSourceMeta } from '@/lib/team-labels';
import { toCsv, csvResponse } from '@/lib/csv';
import { formatClockTime, localMinutesOfDay, dateToDayKey } from '@/lib/time-zone';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Route handlers do not run through the admin layout, so this is the only
  // thing standing between the export and an unauthenticated request.
  await requireRole(Role.ADMIN);

  const params = request.nextUrl.searchParams;
  const filters = {
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
    employeeId: params.get('employeeId') ?? undefined,
    department: params.get('department') ?? undefined,
    status: params.get('status') ?? undefined,
  };

  const [range, policy] = await Promise.all([resolveAttendanceRange(filters), getAttendancePolicy()]);
  const rows = await getAttendanceRegister(filters, range);
  const time = (date: Date | null) => (date ? formatClockTime(localMinutesOfDay(date, policy.timezone)) : '');

  const csv = toCsv(
    ['Date', 'Employee code', 'Employee', 'Department', 'Status', 'Check in', 'Check out', 'Worked minutes', 'Late minutes', 'Overtime minutes', 'Source', 'Notes'],
    rows.map((row) => [
      dateToDayKey(row.date),
      row.employee.employeeCode,
      row.employee.name,
      row.employee.department?.name ?? '',
      attendanceStatusMeta[row.status].label,
      time(row.checkInAt),
      time(row.checkOutAt),
      row.workedMinutes,
      row.lateMinutes,
      row.overtimeMinutes,
      attendanceSourceMeta[row.source],
      row.notes ?? '',
    ]),
  );

  return csvResponse(`attendance-${range.from}-to-${range.to}.csv`, csv);
}
