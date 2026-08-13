import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button, buttonVariants } from '@/components/ui/Button';
import { getEmployees, getDepartmentOptions } from '@/lib/data/team';
import { staffCategoryMeta, employmentTypeMeta, STAFF_CATEGORIES } from '@/lib/team-labels';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Employees' };
export const dynamic = 'force-dynamic';

export default async function EmployeesPage({ searchParams }: PageProps<'/admin/team/employees'>) {
  const params = await searchParams;
  const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

  const filters = {
    q: single(params.q),
    department: single(params.department),
    category: single(params.category),
    status: single(params.status),
  };

  const [employees, departments] = await Promise.all([getEmployees(filters), getDepartmentOptions()]);
  const isFiltered = Boolean(filters.q || filters.department || filters.category || filters.status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Everyone on the payroll, whether or not they have a login. Attendance, leave and service calls all hang off
          these records.
        </p>
        <Link href="/admin/team/employees/new" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
          <Plus className="h-4 w-4" />
          Add employee
        </Link>
      </div>

      <form role="search" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Input name="q" defaultValue={filters.q ?? ''} placeholder="Name, code, phone or email" aria-label="Search employees" />
        </div>
        <Select name="department" defaultValue={filters.department ?? ''} aria-label="Department">
          <option value="">All departments</option>
          {departments.map((department) => (
            <option key={department.slug} value={department.slug}>
              {department.name}
            </option>
          ))}
        </Select>
        <Select name="category" defaultValue={filters.category ?? ''} aria-label="Staff category">
          <option value="">Office and field</option>
          {STAFF_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {staffCategoryMeta[category]}
            </option>
          ))}
        </Select>
        <div className="flex gap-2">
          <Select name="status" defaultValue={filters.status ?? ''} aria-label="Employment status">
            <option value="">Active</option>
            <option value="inactive">Left</option>
            <option value="all">Everyone</option>
          </Select>
          <Button type="submit" variant="outline" aria-label="Apply filters">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {employees.length === 0 ? (
        <EmptyState
          title={isFiltered ? 'Nobody matches those filters' : 'No employees yet'}
          description={
            isFiltered
              ? 'Try a different department, or clear the search.'
              : 'Add your first employee to start recording attendance. An employee does not need a login — field staff usually have none.'
          }
          actionLabel={isFiltered ? undefined : 'Add employee'}
          actionHref={isFiltered ? undefined : '/admin/team/employees/new'}
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Employee</TableHeaderCell>
              <TableHeaderCell>Department</TableHeaderCell>
              <TableHeaderCell>Designation</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Joined</TableHeaderCell>
              <TableHeaderCell>Device ID</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell>
                  <Link
                    href={`/admin/team/employees/${employee.id}`}
                    className="font-medium text-primary hover:underline dark:text-secondary"
                  >
                    {employee.name}
                  </Link>
                  <p className="text-xs text-muted">
                    {employee.employeeCode}
                    {employee.mobile ? ` · ${employee.mobile}` : ''}
                  </p>
                  {!employee.isActive && (
                    <Badge tone="neutral" className="mt-1">
                      Left
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{employee.department?.name ?? '—'}</TableCell>
                <TableCell>{employee.designation?.name ?? '—'}</TableCell>
                <TableCell>
                  <span className="text-xs text-muted">
                    {staffCategoryMeta[employee.category]} · {employmentTypeMeta[employee.employmentType]}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(employee.joiningDate)}</TableCell>
                <TableCell>
                  {employee.biometricId ? (
                    <span className="tabular-nums">{employee.biometricId}</span>
                  ) : (
                    // Without this mapping the device's punches can't reach the
                    // person, so it's worth flagging rather than showing a dash.
                    <Badge tone="warning">Not mapped</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
