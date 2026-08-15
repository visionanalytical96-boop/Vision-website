'use client';

import { useActionState } from 'react';
import { createLeaveRequest, type TeamFormState } from '@/lib/actions/admin-team';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { submittedOr } from '@/lib/form-values';

const initialState: TeamFormState = {};

export function LeaveRequestForm({
  employees,
  leaveTypes,
}: {
  employees: Array<{ id: string; name: string; employeeCode: string }>;
  leaveTypes: Array<{ id: string; name: string; code: string }>;
}) {
  const [state, formAction, pending] = useActionState(createLeaveRequest, initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <FormField label="Employee" htmlFor="leave-employee" error={state.errors?.employeeId} required>
        <Select id="leave-employee" name="employeeId" defaultValue={submittedOr(state.values, 'employeeId', '')} required>
          <option value="">Choose…</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name} ({employee.employeeCode})
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Leave type" htmlFor="leave-type" error={state.errors?.leaveTypeId} required>
        <Select id="leave-type" name="leaveTypeId" defaultValue={submittedOr(state.values, 'leaveTypeId', '')} required>
          <option value="">Choose…</option>
          {leaveTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name} ({type.code})
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Days"
        htmlFor="leave-days"
        error={state.errors?.days}
        hint="Half days allowed, so a range with a holiday in it can still be counted correctly."
        required
      >
        <Input
          id="leave-days"
          name="days"
          type="number"
          step="0.5"
          min="0.5"
          defaultValue={submittedOr(state.values, 'days', '1')}
          required
        />
      </FormField>

      <FormField label="From" htmlFor="leave-start" error={state.errors?.startDate} required>
        <Input id="leave-start" name="startDate" type="date" defaultValue={submittedOr(state.values, 'startDate', '')} required />
      </FormField>

      <FormField label="To" htmlFor="leave-end" error={state.errors?.endDate} required>
        <Input id="leave-end" name="endDate" type="date" defaultValue={submittedOr(state.values, 'endDate', '')} required />
      </FormField>

      <FormField label="Reason" htmlFor="leave-reason" error={state.errors?.reason} required>
        <Input id="leave-reason" name="reason" defaultValue={submittedOr(state.values, 'reason', '')} required />
      </FormField>

      {state.formError && <p className="text-sm text-danger sm:col-span-2 lg:col-span-3">{state.formError}</p>}
      {state.message && <p className="text-sm text-success sm:col-span-2 lg:col-span-3">{state.message}</p>}

      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Record request'}
        </Button>
      </div>
    </form>
  );
}
