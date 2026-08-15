import type { Metadata } from 'next';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ConfirmSubmitButton } from '@/components/forms/ConfirmSubmitButton';
import { DesignationForm } from '@/components/team/DesignationForm';
import { getDepartments, getDesignations, getDepartmentOptions } from '@/lib/data/team';
import { deleteDepartment, deleteDesignation } from '@/lib/actions/admin-team';

export const metadata: Metadata = { title: 'Departments' };
export const dynamic = 'force-dynamic';

export default async function DepartmentsPage() {
  const [departments, designations, options] = await Promise.all([
    getDepartments(),
    getDesignations(),
    getDepartmentOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">Departments</h2>
        <p className="mt-1 text-sm text-muted">
          Departments group employees for filtering and reporting. Deleting one leaves its employees in place, just
          unassigned.
        </p>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Department</TableHeaderCell>
            <TableHeaderCell>Head</TableHeaderCell>
            <TableHeaderCell>Employees</TableHeaderCell>
            <TableHeaderCell>Designations</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {departments.map((department) => (
            <TableRow key={department.id}>
              <TableCell>
                {department.name}
                {department.description && <p className="text-xs text-muted">{department.description}</p>}
              </TableCell>
              <TableCell>{department.head?.name ?? '—'}</TableCell>
              <TableCell className="tabular-nums">{department._count.employees}</TableCell>
              <TableCell className="tabular-nums">{department._count.designations}</TableCell>
              <TableCell>
                <Badge tone={department.isActive ? 'success' : 'neutral'}>
                  {department.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                <form action={deleteDepartment}>
                  <input type="hidden" name="id" value={department.id} />
                  <ConfirmSubmitButton
                    confirmMessage={
                      department._count.employees > 0
                        ? `Delete ${department.name}? ${department._count.employees} employee(s) will be left without a department — nobody is deleted.`
                        : `Delete ${department.name}?`
                    }
                    className="text-xs text-danger hover:underline"
                  >
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a designation</CardTitle>
          <CardDescription>
            Job titles within a department. Leave the department blank for a title that spans the company.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DesignationForm departments={options} />
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 font-display text-base font-semibold text-foreground">Designations</h3>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Designation</TableHeaderCell>
              <TableHeaderCell>Department</TableHeaderCell>
              <TableHeaderCell>Employees</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {designations.map((designation) => (
              <TableRow key={designation.id}>
                <TableCell>{designation.name}</TableCell>
                <TableCell className="text-muted">{designation.department?.name ?? 'Company wide'}</TableCell>
                <TableCell className="tabular-nums">{designation._count.employees}</TableCell>
                <TableCell>
                  <form action={deleteDesignation}>
                    <input type="hidden" name="id" value={designation.id} />
                    <ConfirmSubmitButton
                      confirmMessage={`Delete ${designation.name}? Employees holding it keep their record and lose the title.`}
                      className="text-xs text-danger hover:underline"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
