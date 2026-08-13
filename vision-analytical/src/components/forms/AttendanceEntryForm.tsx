'use client';

import { useActionState } from 'react';
import { saveAttendanceEntry, type TeamFormState } from '@/lib/actions/admin-team';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { submittedOr } from '@/lib/form-values';
import { attendanceStatusMeta, ATTENDANCE_STATUSES } from '@/lib/team-labels';

const initialState: TeamFormState = {};

/**
 * Manual attendance entry.
 *
 * The reason is required, not optional: this row will be read months later by
 * someone asking why a day was changed, and "no reason given" is not an answer
 * a payroll query can be closed with.
 */
export function AttendanceEntryForm({
  employees,
  defaultDate,
  defaultEmployeeId,
  timezone,
}: {
  employees: Array<{ id: string; name: string; employeeCode: string }>;
  defaultDate: string;
  defaultEmployeeId?: string;
  timezone: string;
}) {
  const [state, formAction, pending] = useActionState(saveAttendanceEntry, initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <FormField label="Employee" htmlFor="employeeId" error={state.errors?.employeeId} required>
        <Select
          id="employeeId"
          name="employeeId"
          defaultValue={submittedOr(state.values, 'employeeId', defaultEmployeeId ?? '')}
          required
        >
          <option value="">Choose…</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name} ({employee.employeeCode})
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Date" htmlFor="date" error={state.errors?.date} required>
        <Input id="date" name="date" type="date" defaultValue={submittedOr(state.values, 'date', defaultDate)} required />
      </FormField>

      <FormField label="Status" htmlFor="status" error={state.errors?.status} required>
        <Select id="status" name="status" defaultValue={submittedOr(state.values, 'status', 'PRESENT')} required>
          {ATTENDANCE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {attendanceStatusMeta[status].label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Check in" htmlFor="checkIn" error={state.errors?.checkIn} hint={`Office time (${timezone}).`}>
        <Input id="checkIn" name="checkIn" type="time" defaultValue={submittedOr(state.values, 'checkIn', '')} />
      </FormField>

      <FormField label="Check out" htmlFor="checkOut" error={state.errors?.checkOut}>
        <Input id="checkOut" name="checkOut" type="time" defaultValue={submittedOr(state.values, 'checkOut', '')} />
      </FormField>

      <FormField
        label="Reason"
        htmlFor="notes"
        error={state.errors?.notes}
        hint="Recorded against your name in the activity log."
        required
      >
        <Input
          id="notes"
          name="notes"
          defaultValue={submittedOr(state.values, 'notes', '')}
          placeholder="e.g. Forgot to punch out"
          required
        />
      </FormField>

      {state.formError && <p className="text-sm text-danger sm:col-span-2 lg:col-span-3">{state.formError}</p>}
      {state.message && <p className="text-sm text-success sm:col-span-2 lg:col-span-3">{state.message}</p>}

      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save attendance'}
        </Button>
      </div>
    </form>
  );
}
