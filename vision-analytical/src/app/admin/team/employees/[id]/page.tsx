import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { buttonVariants } from '@/components/ui/Button';
import { ConfirmSubmitButton } from '@/components/forms/ConfirmSubmitButton';
import { getEmployeeById, getEmployeeAttendance, getEmployeeLeave, getAttendancePolicy } from '@/lib/data/team';
import { setEmployeeActive } from '@/lib/actions/admin-team';
import { attendanceStatusMeta, employmentTypeMeta, staffCategoryMeta, leaveRequestStatusMeta } from '@/lib/team-labels';
import { formatDate } from '@/lib/format';
import { formatDuration, formatClockTime, localMinutesOfDay } from '@/lib/time-zone';
import { daysWorked } from '@/lib/attendance';

export const metadata: Metadata = { title: 'Employee' };
export const dynamic = 'force-dynamic';

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value || '—'}</dd>
    </div>
  );
}

export default async function EmployeeProfilePage({ params }: PageProps<'/admin/team/employees/[id]'>) {
  const { id } = await params;
  const [employee, policy] = await Promise.all([getEmployeeById(id), getAttendancePolicy()]);
  if (!employee) notFound();

  const [attendance, leave] = await Promise.all([getEmployeeAttendance(employee.id, 30), getEmployeeLeave(employee.id)]);

  const worked = attendance.reduce((sum, row) => sum + daysWorked(row.status), 0);
  const totalMinutes = attendance.reduce((sum, row) => sum + row.workedMinutes, 0);
  const lateDays = attendance.filter((row) => row.lateMinutes > 0).length;
  const time = (date: Date | null) => (date ? formatClockTime(localMinutesOfDay(date, policy.timezone)) : '—');

  return (
    <div className="space-y-6">
      <Link
        href="/admin/team/employees"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to employees
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">{employee.name}</h2>
          <p className="mt-1 text-sm text-muted">
            {employee.employeeCode} · {employee.designation?.name ?? 'No designation'}
            {employee.department ? ` · ${employee.department.name}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={employee.isActive ? 'success' : 'neutral'}>{employee.isActive ? 'Employed' : 'Left'}</Badge>
            <Badge tone="info">{staffCategoryMeta[employee.category]}</Badge>
            <Badge tone="neutral">{employmentTypeMeta[employee.employmentType]}</Badge>
            {!employee.biometricId && <Badge tone="warning">No device ID</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/team/attendance?employeeId=${employee.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Attendance
          </Link>
          <Link
            href={`/admin/team/employees/${employee.id}/edit`}
            className={buttonVariants({ variant: 'primary', size: 'sm' })}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
          <form action={setEmployeeActive}>
            <input type="hidden" name="id" value={employee.id} />
            <ConfirmSubmitButton
              confirmMessage={
                employee.isActive
                  ? `Mark ${employee.name} as having left? Their attendance history is kept — they just stop appearing in daily lists.`
                  : `Bring ${employee.name} back onto the active list?`
              }
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              {employee.isActive ? 'Mark as left' : 'Reactivate'}
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-3">
              <Detail label="Joined" value={formatDate(employee.joiningDate)} />
              <Detail label="Left" value={employee.exitDate ? formatDate(employee.exitDate) : '—'} />
              <Detail label="Date of birth" value={employee.dateOfBirth ? formatDate(employee.dateOfBirth) : '—'} />
              <Detail label="Mobile" value={employee.mobile} />
              <Detail label="Email" value={employee.email} />
              <Detail label="Device ID" value={employee.biometricId} />
              <Detail label="Reports to" value={employee.reportingTo?.name} />
              <Detail
                label="Login"
                value={employee.user ? `${employee.user.email} (${employee.user.role.toLowerCase()})` : 'No account'}
              />
              <Detail label="Emergency" value={
                employee.emergencyContactName
                  ? `${employee.emergencyContactName}${employee.emergencyContactPhone ? ` · ${employee.emergencyContactPhone}` : ''}`
                  : '—'
              } />
              <Detail
                label="Address"
                value={[employee.addressLine, employee.city, employee.state, employee.postalCode]
                  .filter(Boolean)
                  .join(', ')}
              />
              <Detail label="Skills" value={employee.skills.length > 0 ? employee.skills.join(', ') : '—'} />
              <Detail label="Direct reports" value={employee.directReports.length || '—'} />
            </dl>
            {employee.notes && (
              <div className="mt-4 rounded-lg bg-surface-muted p-3">
                <p className="text-xs text-muted uppercase">Internal notes</p>
                <p className="mt-1 text-sm whitespace-pre-wrap text-foreground">{employee.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Last 30 days</CardTitle>
            <CardDescription>From the attendance records on file.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Days worked</span>
              <span className="tabular-nums text-foreground">{worked}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Hours</span>
              <span className="tabular-nums text-foreground">{formatDuration(totalMinutes)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Days late</span>
              <span className="tabular-nums text-foreground">{lateDays}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Days recorded</span>
              <span className="tabular-nums text-foreground">{attendance.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {employee.directReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reports to {employee.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {employee.directReports.map((report) => (
              <Link
                key={report.id}
                href={`/admin/team/employees/${report.id}`}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-surface-muted"
              >
                {report.name}
                <span className="ml-2 text-xs text-muted">{report.employeeCode}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="mb-3 font-display text-base font-semibold text-foreground">Recent attendance</h3>
        {attendance.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
            No attendance recorded in the last 30 days.
          </p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>In</TableHeaderCell>
                <TableHeaderCell>Out</TableHeaderCell>
                <TableHeaderCell>Worked</TableHeaderCell>
                <TableHeaderCell>Late</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attendance.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(row.date)}</TableCell>
                  <TableCell>
                    <Badge tone={attendanceStatusMeta[row.status].tone}>{attendanceStatusMeta[row.status].label}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{time(row.checkInAt)}</TableCell>
                  <TableCell className="tabular-nums">{time(row.checkOutAt)}</TableCell>
                  <TableCell className="tabular-nums">{formatDuration(row.workedMinutes)}</TableCell>
                  <TableCell className="tabular-nums">
                    {row.lateMinutes > 0 ? formatDuration(row.lateMinutes) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div>
        <h3 className="mb-3 font-display text-base font-semibold text-foreground">Leave</h3>
        {leave.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
            No leave requested.
          </p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>From</TableHeaderCell>
                <TableHeaderCell>To</TableHeaderCell>
                <TableHeaderCell>Days</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leave.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.leaveType.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(request.startDate)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(request.endDate)}</TableCell>
                  <TableCell className="tabular-nums">{request.days}</TableCell>
                  <TableCell>
                    <Badge tone={leaveRequestStatusMeta[request.status].tone}>
                      {leaveRequestStatusMeta[request.status].label}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
