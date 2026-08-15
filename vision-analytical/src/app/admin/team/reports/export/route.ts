import type { NextRequest } from 'next/server';
import { requireRole } from '@/lib/dal';
import { Role } from '@/generated/prisma/client';
import { getMonthlyReport, getToday } from '@/lib/data/team';
import { toCsv, csvResponse } from '@/lib/csv';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Route handlers bypass the admin layout, so the gate lives here.
  await requireRole(Role.ADMIN);

  const requested = request.nextUrl.searchParams.get('month');
  const month = requested && /^\d{4}-\d{2}$/.test(requested) ? requested : (await getToday()).slice(0, 7);
  const { rows, workingDays } = await getMonthlyReport(month);

  const csv = toCsv(
    [
      'Employee code',
      'Employee',
      'Department',
      'Present',
      'Late',
      'Half day',
      'Absent',
      'On leave',
      'Days worked',
      'Worked minutes',
      'Overtime minutes',
      'Working days in month',
    ],
    rows.map((row) => [
      row.employeeCode,
      row.name,
      row.department,
      row.present,
      row.late,
      row.halfDay,
      row.absent,
      row.onLeave,
      row.daysWorked,
      row.workedMinutes,
      row.overtimeMinutes,
      workingDays,
    ]),
  );

  return csvResponse(`attendance-summary-${month}.csv`, csv);
}
