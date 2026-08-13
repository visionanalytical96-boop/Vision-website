'use client';

import { useActionState } from 'react';
import { saveHoliday, type TeamFormState } from '@/lib/actions/admin-team';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { submittedOr, submittedChecked } from '@/lib/form-values';

const initialState: TeamFormState = {};

export function HolidayForm({ defaultYear }: { defaultYear: number }) {
  const [state, formAction, pending] = useActionState(saveHoliday, initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <FormField label="Date" htmlFor="holiday-date" error={state.errors?.date} required>
        <Input
          id="holiday-date"
          name="date"
          type="date"
          defaultValue={submittedOr(state.values, 'date', '')}
          min={`${defaultYear}-01-01`}
          max={`${defaultYear}-12-31`}
          required
        />
      </FormField>

      <FormField label="Name" htmlFor="holiday-name" error={state.errors?.name} required>
        <Input
          id="holiday-name"
          name="name"
          defaultValue={submittedOr(state.values, 'name', '')}
          placeholder="e.g. Diwali"
          required
        />
      </FormField>

      <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="isOptional"
          value="true"
          defaultChecked={submittedChecked(state.values, 'isOptional', false)}
          className="h-4 w-4 rounded border-border"
        />
        Optional holiday
      </label>

      <div className="self-end pb-1">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Add holiday'}
        </Button>
      </div>

      {state.formError && <p className="text-sm text-danger sm:col-span-2 lg:col-span-4">{state.formError}</p>}
      {state.message && <p className="text-sm text-success sm:col-span-2 lg:col-span-4">{state.message}</p>}
    </form>
  );
}
