import type { Metadata } from 'next';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { CalendarDays, Users, Clock, TrendingUp } from 'lucide-react';
import { getMonthlyReport, getToday } from '@/lib/data/team';
import { formatDuration } from '@/lib/time-zone';

export const metadata: Metadata = { title: 'Team Reports' };
export const dynamic = 'force-dynamic';

export default async function TeamReportsPage({ searchParams }: PageProps<'/admin/team/reports'>) {
  const params = await searchParams;
  const requested = Array.isArray(params.month) ? params.month[0] : params.month;
  const today = await getToday();
  const month = requested && /^\d{4}-\d{2}$/.test(requested) ? requested : today.slice(0, 7);

  const { rows, workingDays } = await getMonthlyReport(month);
  const totalWorked = rows.reduce((sum, row) => sum + row.workedMinutes, 0);
  const totalOvertime = rows.reduce((sum, row) => sum + row.overtimeMinutes, 0);
  const totalDays = rows.reduce((sum, row) => sum + row.daysWorked, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <form className="flex items-end gap-3">
          <div>
            <label htmlFor="month" className="mb-1.5 block text-sm font-medium text-foreground">
              Month
            </label>
            <Input id="month" name="month" type="month" defaultValue={month} />
          </div>
          <Button type="submit" variant="outline">
            Show
          </Button>
        </form>
        {rows.length > 0 && (
          <Link
            href={`/admin/team/reports/export?month=${month}`}
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline dark:text-secondary"
          >
            <Download className="h-4 w-4" />
            Download CSV
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Working days" value={workingDays} icon={<CalendarDays className="h-5 w-5" />} />
        <StatCard label="Employees" value={rows.length} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Days worked" value={totalDays} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Overtime" value={formatDuration(totalOvertime)} icon={<Clock className="h-5 w-5" />} />
      </div>

      <p className="text-sm text-muted">
        {workingDays} working day{workingDays === 1 ? '' : 's'} in {month} after weekly offs and company holidays.
        {totalWorked > 0 ? ` ${formatDuration(totalWorked)} recorded across the team.` : ''}
      </p>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted">
          No active employees to report on.
        </p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Employee</TableHeaderCell>
              <TableHeaderCell>Department</TableHeaderCell>
              <TableHeaderCell>Present</TableHeaderCell>
              <TableHeaderCell>Late</TableHeaderCell>
              <TableHeaderCell>Half</TableHeaderCell>
              <TableHeaderCell>Absent</TableHeaderCell>
              <TableHeaderCell>Leave</TableHeaderCell>
              <TableHeaderCell>Days</TableHeaderCell>
              <TableHeaderCell>Hours</TableHeaderCell>
              <TableHeaderCell>Overtime</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.employeeId}>
                <TableCell>
                  <Link
                    href={`/admin/team/employees/${row.employeeId}`}
                    className="text-primary hover:underline dark:text-secondary"
                  >
                    {row.name}
                  </Link>
                  <p className="text-xs text-muted">{row.employeeCode}</p>
                </TableCell>
                <TableCell className="text-muted">{row.department}</TableCell>
                <TableCell className="tabular-nums">{row.present}</TableCell>
                <TableCell className="tabular-nums">{row.late}</TableCell>
                <TableCell className="tabular-nums">{row.halfDay}</TableCell>
                <TableCell className="tabular-nums">{row.absent}</TableCell>
                <TableCell className="tabular-nums">{row.onLeave}</TableCell>
                <TableCell className="tabular-nums font-medium">{row.daysWorked}</TableCell>
                <TableCell className="tabular-nums">{formatDuration(row.workedMinutes)}</TableCell>
                <TableCell className="tabular-nums">{formatDuration(row.overtimeMinutes)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <p className="max-w-3xl text-sm text-muted">
        Days worked counts a half day as 0.5 and paid leave as 0 — attendance, not pay. Whether leave is paid lives on
        the leave type, and folding the two together here is how an attendance total quietly becomes a wrong salary.
      </p>
    </div>
  );
}
