'use client';

import { useActionState } from 'react';
import { importPunchCsv, type TeamFormState } from '@/lib/actions/admin-team';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';

const initialState: TeamFormState = {};

export function PunchImportForm({ devices }: { devices: Array<{ id: string; name: string }> }) {
  const [state, formAction, pending] = useActionState(importPunchCsv, initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <FormField label="CSV file" htmlFor="punch-file" error={state.errors?.file} required>
        <input
          id="punch-file"
          name="file"
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          required
          className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
        />
      </FormField>

      {devices.length > 0 && (
        <FormField label="From device" htmlFor="punch-device" hint="Optional — records where the file came from.">
          <Select id="punch-device" name="deviceId" defaultValue="">
            <option value="">Not specified</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </Select>
        </FormField>
      )}

      <div className="self-end pb-1">
        <Button type="submit" disabled={pending}>
          {pending ? 'Importing…' : 'Import punches'}
        </Button>
      </div>

      {state.formError && <p className="text-sm text-danger sm:col-span-2 lg:col-span-3">{state.formError}</p>}
      {state.message && <p className="text-sm text-success sm:col-span-2 lg:col-span-3">{state.message}</p>}
    </form>
  );
}
