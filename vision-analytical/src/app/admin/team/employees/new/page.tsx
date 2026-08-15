import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { EmployeeForm } from '@/components/forms/EmployeeForm';
import { getDepartmentOptions, getDesignationOptions, getEmployeeOptions, getLinkableUsers } from '@/lib/data/team';

export const metadata: Metadata = { title: 'Add Employee' };
export const dynamic = 'force-dynamic';

export default async function NewEmployeePage() {
  const [departments, designations, managers, users] = await Promise.all([
    getDepartmentOptions(),
    getDesignationOptions(),
    getEmployeeOptions(),
    getLinkableUsers(),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/team/employees"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to employees
      </Link>

      <EmployeeForm departments={departments} designations={designations} managers={managers} users={users} />
    </div>
  );
}
