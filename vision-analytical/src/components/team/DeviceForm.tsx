'use client';

import { useActionState } from 'react';
import { saveBiometricDevice, type TeamFormState } from '@/lib/actions/admin-team';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { submittedOr, submittedChecked } from '@/lib/form-values';

const initialState: TeamFormState = {};

export function DeviceForm() {
  const [state, formAction, pending] = useActionState(saveBiometricDevice.bind(null, null), initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <FormField label="Name" htmlFor="device-name" error={state.errors?.name} hint="Where it is, e.g. Front gate." required>
        <Input id="device-name" name="name" defaultValue={submittedOr(state.values, 'name', '')} required />
      </FormField>

      <FormField label="Model" htmlFor="device-model" error={state.errors?.model} required>
        <Input
          id="device-model"
          name="model"
          defaultValue={submittedOr(state.values, 'model', 'Team Office Z900')}
          required
        />
      </FormField>

      <FormField label="Serial number" htmlFor="device-serial" error={state.errors?.serialNumber}>
        <Input id="device-serial" name="serialNumber" defaultValue={submittedOr(state.values, 'serialNumber', '')} />
      </FormField>

      <FormField
        label="IP address or hostname"
        htmlFor="device-host"
        error={state.errors?.host}
        hint="On your LAN, e.g. 192.168.1.201."
        required
      >
        <Input id="device-host" name="host" defaultValue={submittedOr(state.values, 'host', '')} required />
      </FormField>

      <FormField label="Port" htmlFor="device-port" error={state.errors?.port} hint="4370 on most devices." required>
        <Input
          id="device-port"
          name="port"
          type="number"
          min="1"
          max="65535"
          defaultValue={submittedOr(state.values, 'port', '4370')}
          required
        />
      </FormField>

      <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="isActive"
          value="true"
          defaultChecked={submittedChecked(state.values, 'isActive', true)}
          className="h-4 w-4 rounded border-border"
        />
        In use
      </label>

      {state.formError && <p className="text-sm text-danger sm:col-span-2 lg:col-span-3">{state.formError}</p>}
      {state.message && <p className="text-sm text-success sm:col-span-2 lg:col-span-3">{state.message}</p>}

      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Add device'}
        </Button>
      </div>
    </form>
  );
}
