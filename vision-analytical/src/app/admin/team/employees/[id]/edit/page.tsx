import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { EmployeeForm } from '@/components/forms/EmployeeForm';
import {
  getEmployeeById,
  getDepartmentOptions,
  getDesignationOptions,
  getEmployeeOptions,
  getLinkableUsers,
} from '@/lib/data/team';

export const metadata: Metadata = { title: 'Edit Employee' };
export const dynamic = 'force-dynamic';

export default async function EditEmployeePage({ params }: PageProps<'/admin/team/employees/[id]/edit'>) {
  const { id } = await params;
  const employee = await getEmployeeById(id);
  if (!employee) notFound();

  const [departments, designations, managers, users] = await Promise.all([
    getDepartmentOptions(),
    getDesignationOptions(),
    getEmployeeOptions(),
    getLinkableUsers(employee.userId),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/team/employees/${employee.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {employee.name}
      </Link>

      <EmployeeForm
        employee={employee}
        departments={departments}
        designations={designations}
        managers={managers}
        users={users}
      />
    </div>
  );
}
