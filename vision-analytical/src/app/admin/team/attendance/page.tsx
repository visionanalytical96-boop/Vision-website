import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, Download } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { AttendanceEntryForm } from '@/components/forms/AttendanceEntryForm';
import {
  getAttendanceRegister,
  getAttendanceTotals,
  resolveAttendanceRange,
  getEmployeeOptions,
  getDepartmentOptions,
  getAttendancePolicy,
  getToday,
} from '@/lib/data/team';
import { attendanceStatusMeta, attendanceSourceMeta, ATTENDANCE_STATUSES } from '@/lib/team-labels';
import { formatDate } from '@/lib/format';
import { formatDuration, formatClockTime, localMinutesOfDay } from '@/lib/time-zone';

export const metadata: Metadata = { title: 'Attendance' };
export const dynamic = 'force-dynamic';

export default async function AttendancePage({ searchParams }: PageProps<'/admin/team/attendance'>) {
  const params = await searchParams;
  const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

  const filters = {
    from: single(params.from),
    to: single(params.to),
    employeeId: single(params.employeeId),
    department: single(params.department),
    status: single(params.status),
  };

  const [range, policy, employees, departments, today] = await Promise.all([
    resolveAttendanceRange(filters),
    getAttendancePolicy(),
    getEmployeeOptions(),
    getDepartmentOptions(),
    getToday(),
  ]);

  const rows = await getAttendanceRegister(filters, range);
  const totals = getAttendanceTotals(rows);
  const time = (date: Date | null) => (date ? formatClockTime(localMinutesOfDay(date, policy.timezone)) : '—');

  const exportQuery = new URLSearchParams({
    from: range.from,
    to: range.to,
    ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
    ...(filters.department ? { department: filters.department } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  });

  return (
    <div className="space-y-6">
      {employees.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted">
              There are no employees yet, so there is nothing to record attendance against.{' '}
              <Link href="/admin/team/employees/new" className="text-primary hover:underline dark:text-secondary">
                Add your first employee
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Record attendance by hand</CardTitle>
            <CardDescription>
              For corrections and for days the device missed. Saving creates the day if it doesn&apos;t exist, or
              overwrites it if it does — either way the change is logged against your name.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AttendanceEntryForm
              employees={employees}
              defaultDate={today}
              defaultEmployeeId={filters.employeeId}
              timezone={policy.timezone}
            />
          </CardContent>
        </Card>
      )}

      <form role="search" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Input type="date" name="from" defaultValue={range.from} aria-label="From date" />
        <Input type="date" name="to" defaultValue={range.to} aria-label="To date" />
        <Select name="employeeId" defaultValue={filters.employeeId ?? ''} aria-label="Employee">
          <option value="">All employees</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </Select>
        <Select name="department" defaultValue={filters.department ?? ''} aria-label="Department">
          <option value="">All departments</option>
          {departments.map((department) => (
            <option key={department.slug} value={department.slug}>
              {department.name}
            </option>
          ))}
        </Select>
        <Select name="status" defaultValue={filters.status ?? ''} aria-label="Status">
          <option value="">Any status</option>
          {ATTENDANCE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {attendanceStatusMeta[status].label}
            </option>
          ))}
        </Select>
        <div className="flex gap-2">
          <Button type="submit" variant="outline" className="flex-1">
            <Search className="h-4 w-4" />
            Filter
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {rows.length === 0
            ? 'No attendance in this range.'
            : `${rows.length} row(s) · ${totals.days} day(s) worked · ${formatDuration(totals.workedMinutes)} total`}
          {totals.overtimeMinutes > 0 ? ` · ${formatDuration(totals.overtimeMinutes)} overtime` : ''}
        </p>
        {rows.length > 0 && (
          <a
            href={`/admin/team/attendance/export?${exportQuery.toString()}`}
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline dark:text-secondary"
          >
            <Download className="h-4 w-4" />
            Download CSV
          </a>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted">
          Nothing recorded between {range.from} and {range.to}.
        </p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Employee</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>In</TableHeaderCell>
              <TableHeaderCell>Out</TableHeaderCell>
              <TableHeaderCell>Worked</TableHeaderCell>
              <TableHeaderCell>Late</TableHeaderCell>
              <TableHeaderCell>Source</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap">{formatDate(row.date)}</TableCell>
                <TableCell>
                  <Link
                    href={`/admin/team/employees/${row.employee.id}`}
                    className="text-primary hover:underline dark:text-secondary"
                  >
                    {row.employee.name}
                  </Link>
                  <p className="text-xs text-muted">{row.employee.department?.name ?? row.employee.employeeCode}</p>
                </TableCell>
                <TableCell>
                  <Badge tone={attendanceStatusMeta[row.status].tone}>{attendanceStatusMeta[row.status].label}</Badge>
                </TableCell>
                <TableCell className="tabular-nums">{time(row.checkInAt)}</TableCell>
                <TableCell className="tabular-nums">{time(row.checkOutAt)}</TableCell>
                <TableCell className="tabular-nums">{formatDuration(row.workedMinutes)}</TableCell>
                <TableCell className="tabular-nums">
                  {row.lateMinutes > 0 ? formatDuration(row.lateMinutes) : '—'}
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted">{attendanceSourceMeta[row.source]}</span>
                  {row.notes && <p className="max-w-[16rem] truncate text-xs text-muted" title={row.notes}>{row.notes}</p>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
