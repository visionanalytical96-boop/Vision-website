'use client';

import { useActionState, useState } from 'react';
import { createEmployee, updateEmployee, type TeamFormState } from '@/lib/actions/admin-team';
import type { Employee } from '@/generated/prisma/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { submittedOr, submittedChecked } from '@/lib/form-values';
import {
  employmentTypeMeta,
  staffCategoryMeta,
  EMPLOYMENT_TYPES,
  STAFF_CATEGORIES,
} from '@/lib/team-labels';

const initialState: TeamFormState = {};

interface Option {
  id: string;
  name: string;
}

export function EmployeeForm({
  employee,
  departments,
  designations,
  managers,
  users,
}: {
  employee?: Employee;
  departments: Array<Option & { slug: string }>;
  designations: Array<Option & { departmentId: string | null }>;
  managers: Array<{ id: string; name: string; employeeCode: string }>;
  users: Array<{ id: string; name: string; email: string }>;
}) {
  const action = employee ? updateEmployee.bind(null, employee.id) : createEmployee;
  const [state, formAction, pending] = useActionState(action, initialState);

  // Designations belong to a department, so the second list narrows as soon as
  // the first is chosen - otherwise you can file a Store Keeper under Sales.
  const [departmentId, setDepartmentId] = useState(
    submittedOr(state.values, 'departmentId', employee?.departmentId ?? ''),
  );
  const visibleDesignations = departmentId
    ? designations.filter((item) => item.departmentId === departmentId || item.departmentId === null)
    : designations;

  const dateValue = (date: Date | null | undefined) => (date ? date.toISOString().slice(0, 10) : '');

  return (
    <form action={formAction} className="space-y-8">
      <section className="grid max-w-4xl gap-4 sm:grid-cols-2">
        <h2 className="font-display text-base font-semibold text-foreground sm:col-span-2">Identity</h2>

        <FormField label="Full name" htmlFor="name" error={state.errors?.name} required>
          <Input id="name" name="name" defaultValue={submittedOr(state.values, 'name', employee?.name)} required />
        </FormField>

        <FormField
          label="Employee code"
          htmlFor="employeeCode"
          error={state.errors?.employeeCode}
          hint="Your own reference, e.g. VA-014."
          required
        >
          <Input
            id="employeeCode"
            name="employeeCode"
            defaultValue={submittedOr(state.values, 'employeeCode', employee?.employeeCode)}
            required
          />
        </FormField>

        <FormField label="Department" htmlFor="departmentId" error={state.errors?.departmentId}>
          <Select
            id="departmentId"
            name="departmentId"
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
          >
            <option value="">Not assigned</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Designation" htmlFor="designationId" error={state.errors?.designationId}>
          <Select
            id="designationId"
            name="designationId"
            defaultValue={submittedOr(state.values, 'designationId', employee?.designationId ?? '')}
          >
            <option value="">Not assigned</option>
            {visibleDesignations.map((designation) => (
              <option key={designation.id} value={designation.id}>
                {designation.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Staff category" htmlFor="category" error={state.errors?.category} required>
          <Select
            id="category"
            name="category"
            defaultValue={submittedOr(state.values, 'category', employee?.category ?? 'OFFICE_STAFF')}
          >
            {STAFF_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {staffCategoryMeta[category]}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Employment type" htmlFor="employmentType" error={state.errors?.employmentType} required>
          <Select
            id="employmentType"
            name="employmentType"
            defaultValue={submittedOr(state.values, 'employmentType', employee?.employmentType ?? 'FULL_TIME')}
          >
            {EMPLOYMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {employmentTypeMeta[type]}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Reports to" htmlFor="reportingToId" error={state.errors?.reportingToId}>
          <Select
            id="reportingToId"
            name="reportingToId"
            defaultValue={submittedOr(state.values, 'reportingToId', employee?.reportingToId ?? '')}
          >
            <option value="">Nobody</option>
            {managers
              .filter((manager) => manager.id !== employee?.id)
              .map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name} ({manager.employeeCode})
                </option>
              ))}
          </Select>
        </FormField>

        <FormField
          label="Linked login"
          htmlFor="userId"
          error={state.errors?.userId}
          hint="Only if this person signs in. Field staff often have no account."
        >
          <Select id="userId" name="userId" defaultValue={submittedOr(state.values, 'userId', employee?.userId ?? '')}>
            <option value="">No login</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </Select>
        </FormField>
      </section>

      <section className="grid max-w-4xl gap-4 sm:grid-cols-2">
        <h2 className="font-display text-base font-semibold text-foreground sm:col-span-2">Employment dates</h2>

        <FormField label="Joining date" htmlFor="joiningDate" error={state.errors?.joiningDate} required>
          <Input
            id="joiningDate"
            name="joiningDate"
            type="date"
            defaultValue={submittedOr(state.values, 'joiningDate', dateValue(employee?.joiningDate))}
            required
          />
        </FormField>

        <FormField
          label="Exit date"
          htmlFor="exitDate"
          error={state.errors?.exitDate}
          hint="Leave blank while they are still with you."
        >
          <Input
            id="exitDate"
            name="exitDate"
            type="date"
            defaultValue={submittedOr(state.values, 'exitDate', dateValue(employee?.exitDate))}
          />
        </FormField>

        <FormField label="Date of birth" htmlFor="dateOfBirth" error={state.errors?.dateOfBirth}>
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            defaultValue={submittedOr(state.values, 'dateOfBirth', dateValue(employee?.dateOfBirth))}
          />
        </FormField>

        <FormField
          label="Biometric device ID"
          htmlFor="biometricId"
          error={state.errors?.biometricId}
          hint="The user number programmed into the attendance device. Punches are matched by this alone."
        >
          <Input
            id="biometricId"
            name="biometricId"
            defaultValue={submittedOr(state.values, 'biometricId', employee?.biometricId ?? '')}
            placeholder="e.g. 14"
          />
        </FormField>
      </section>

      <section className="grid max-w-4xl gap-4 sm:grid-cols-2">
        <h2 className="font-display text-base font-semibold text-foreground sm:col-span-2">Contact</h2>

        <FormField label="Mobile" htmlFor="mobile" error={state.errors?.mobile}>
          <Input id="mobile" name="mobile" defaultValue={submittedOr(state.values, 'mobile', employee?.mobile ?? '')} />
        </FormField>

        <FormField label="Email" htmlFor="email" error={state.errors?.email}>
          <Input id="email" name="email" type="email" defaultValue={submittedOr(state.values, 'email', employee?.email ?? '')} />
        </FormField>

        <FormField label="Emergency contact" htmlFor="emergencyContactName" error={state.errors?.emergencyContactName}>
          <Input
            id="emergencyContactName"
            name="emergencyContactName"
            defaultValue={submittedOr(state.values, 'emergencyContactName', employee?.emergencyContactName ?? '')}
          />
        </FormField>

        <FormField label="Emergency phone" htmlFor="emergencyContactPhone" error={state.errors?.emergencyContactPhone}>
          <Input
            id="emergencyContactPhone"
            name="emergencyContactPhone"
            defaultValue={submittedOr(state.values, 'emergencyContactPhone', employee?.emergencyContactPhone ?? '')}
          />
        </FormField>

        <FormField label="Address" htmlFor="addressLine" error={state.errors?.addressLine} className="sm:col-span-2">
          <Input
            id="addressLine"
            name="addressLine"
            defaultValue={submittedOr(state.values, 'addressLine', employee?.addressLine ?? '')}
          />
        </FormField>

        <FormField label="City" htmlFor="city" error={state.errors?.city}>
          <Input id="city" name="city" defaultValue={submittedOr(state.values, 'city', employee?.city ?? '')} />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="State" htmlFor="state" error={state.errors?.state}>
            <Input id="state" name="state" defaultValue={submittedOr(state.values, 'state', employee?.state ?? '')} />
          </FormField>
          <FormField label="PIN code" htmlFor="postalCode" error={state.errors?.postalCode}>
            <Input
              id="postalCode"
              name="postalCode"
              defaultValue={submittedOr(state.values, 'postalCode', employee?.postalCode ?? '')}
            />
          </FormField>
        </div>
      </section>

      <section className="grid max-w-4xl gap-4">
        <h2 className="font-display text-base font-semibold text-foreground">Notes</h2>

        <FormField
          label="Skills"
          htmlFor="skills"
          error={state.errors?.skills}
          hint="Comma separated, e.g. HPLC, GC-MS, UV-Vis. Used to match engineers to service calls."
        >
          <Input
            id="skills"
            name="skills"
            defaultValue={submittedOr(state.values, 'skills', employee?.skills.join(', ') ?? '')}
            placeholder="HPLC, GC-MS"
          />
        </FormField>

        <FormField label="Internal notes" htmlFor="notes" error={state.errors?.notes}>
          <Textarea id="notes" name="notes" rows={3} defaultValue={submittedOr(state.values, 'notes', employee?.notes ?? '')} />
        </FormField>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="isActive"
            value="true"
            defaultChecked={submittedChecked(state.values, 'isActive', employee?.isActive ?? true)}
            className="h-4 w-4 rounded border-border"
          />
          Currently employed
        </label>
      </section>

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : employee ? 'Save changes' : 'Add employee'}
      </Button>
    </form>
  );
}
