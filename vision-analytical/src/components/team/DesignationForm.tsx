'use client';

import { useActionState } from 'react';
import { saveDesignation, type TeamFormState } from '@/lib/actions/admin-team';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { submittedOr } from '@/lib/form-values';

const initialState: TeamFormState = {};

export function DesignationForm({ departments }: { departments: Array<{ id: string; name: string }> }) {
  const [state, formAction, pending] = useActionState(saveDesignation, initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <FormField label="Title" htmlFor="designation-name" error={state.errors?.name} required>
        <Input
          id="designation-name"
          name="name"
          defaultValue={submittedOr(state.values, 'name', '')}
          placeholder="e.g. Service Engineer"
          required
        />
      </FormField>

      <FormField label="Department" htmlFor="designation-department" error={state.errors?.departmentId}>
        <Select
          id="designation-department"
          name="departmentId"
          defaultValue={submittedOr(state.values, 'departmentId', '')}
        >
          <option value="">Company wide</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Sort order" htmlFor="designation-sort" error={state.errors?.sortOrder}>
        <Input
          id="designation-sort"
          name="sortOrder"
          type="number"
          defaultValue={submittedOr(state.values, 'sortOrder', '0')}
        />
      </FormField>

      <div className="self-end pb-1">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Add designation'}
        </Button>
      </div>

      {state.formError && <p className="text-sm text-danger sm:col-span-2 lg:col-span-4">{state.formError}</p>}
      {state.message && <p className="text-sm text-success sm:col-span-2 lg:col-span-4">{state.message}</p>}
    </form>
  );
}
