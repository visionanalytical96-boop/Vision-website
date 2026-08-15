import type { Metadata } from 'next';
import Link from 'next/link';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { buttonVariants } from '@/components/ui/Button';
import { LeaveRequestForm } from '@/components/team/LeaveRequestForm';
import { LeaveDecisionButtons } from '@/components/team/LeaveDecisionButtons';
import { getLeaveRequests, getLeaveTypes, getEmployeeOptions, getLeaveTypeOptions } from '@/lib/data/team';
import { leaveRequestStatusMeta, LEAVE_REQUEST_STATUSES } from '@/lib/team-labels';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Leave' };
export const dynamic = 'force-dynamic';

export default async function LeavePage({ searchParams }: PageProps<'/admin/team/leave'>) {
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;

  const [requests, leaveTypes, employees, typeOptions] = await Promise.all([
    getLeaveRequests(status),
    getLeaveTypes(),
    getEmployeeOptions(),
    getLeaveTypeOptions(),
  ]);

  return (
    <div className="space-y-6">
      {employees.length > 0 && typeOptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Record a leave request</CardTitle>
            <CardDescription>
              Approving one writes the attendance days as On leave, so an approved absence never shows up in the
              register as an unexplained gap.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeaveRequestForm employees={employees} leaveTypes={typeOptions} />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/admin/team/leave"
          className={buttonVariants({ variant: status ? 'outline' : 'primary', size: 'sm' })}
        >
          All
        </Link>
        {LEAVE_REQUEST_STATUSES.map((value) => (
          <Link
            key={value}
            href={`/admin/team/leave?status=${value}`}
            className={buttonVariants({ variant: status === value ? 'primary' : 'outline', size: 'sm' })}
          >
            {leaveRequestStatusMeta[value].label}
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted">
          {status ? 'Nothing with that status.' : 'No leave has been requested yet.'}
        </p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Employee</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Dates</TableHeaderCell>
              <TableHeaderCell>Days</TableHeaderCell>
              <TableHeaderCell>Reason</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  <Link
                    href={`/admin/team/employees/${request.employee.id}`}
                    className="text-primary hover:underline dark:text-secondary"
                  >
                    {request.employee.name}
                  </Link>
                  <p className="text-xs text-muted">{request.employee.department?.name ?? request.employee.employeeCode}</p>
                </TableCell>
                <TableCell>
                  {request.leaveType.name}
                  <p className="text-xs text-muted">{request.leaveType.isPaid ? 'Paid' : 'Unpaid'}</p>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDate(request.startDate)}
                  <p className="text-xs text-muted">to {formatDate(request.endDate)}</p>
                </TableCell>
                <TableCell className="tabular-nums">{request.days}</TableCell>
                <TableCell className="max-w-[18rem]">
                  <p className="truncate" title={request.reason}>
                    {request.reason}
                  </p>
                  {request.decisionNote && <p className="truncate text-xs text-muted">{request.decisionNote}</p>}
                </TableCell>
                <TableCell>
                  <Badge tone={leaveRequestStatusMeta[request.status].tone}>
                    {leaveRequestStatusMeta[request.status].label}
                  </Badge>
                  {request.decidedBy && <p className="mt-1 text-xs text-muted">by {request.decidedBy.name}</p>}
                </TableCell>
                <TableCell>
                  {request.status === 'PENDING' && (
                    <LeaveDecisionButtons
                      id={request.id}
                      employeeName={request.employee.name}
                      days={request.days}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leave types</CardTitle>
          <CardDescription>Quotas are your policy — edit them to match what you actually grant.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Code</TableHeaderCell>
                <TableHeaderCell>Days per year</TableHeaderCell>
                <TableHeaderCell>Paid</TableHeaderCell>
                <TableHeaderCell>Used</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaveTypes.map((type) => (
                <TableRow key={type.id}>
                  <TableCell>{type.name}</TableCell>
                  <TableCell className="tabular-nums">{type.code}</TableCell>
                  <TableCell className="tabular-nums">{type.annualQuota ?? 'Uncapped'}</TableCell>
                  <TableCell>{type.isPaid ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="tabular-nums">{type._count.requests}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
