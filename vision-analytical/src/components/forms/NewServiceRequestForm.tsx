'use client';

import { useActionState } from 'react';
import { createServiceRequest, type ServiceRequestFormState } from '@/lib/actions/service-requests';
// Enum values, not the client module - see the comment in src/lib/status.ts.
import { ServiceRequestType, Priority } from '@/generated/prisma/enums';
import { SERVICE_REQUEST_TYPE_LABELS, PRIORITY_LABELS } from '@/lib/service-request-labels';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';

const initialState: ServiceRequestFormState = {};

interface AmcContractOption {
  id: string;
  contractNumber: string;
  type: string;
  instrumentDescription: string;
}

export function NewServiceRequestForm({ amcContracts = [] }: { amcContracts?: AmcContractOption[] }) {
  const [state, formAction, pending] = useActionState(createServiceRequest, initialState);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      {amcContracts.length > 0 && (
        <FormField
          label="Cover under an AMC/CMC contract"
          htmlFor="amcContractId"
          error={state.errors?.amcContractId}
          hint="Optional - links this visit to the contract and counts it against your included visits"
        >
          <Select id="amcContractId" name="amcContractId" defaultValue="">
            <option value="">Not covered by a contract</option>
            {amcContracts.map((contract) => (
              <option key={contract.id} value={contract.id}>
                {contract.contractNumber} ({contract.type}) - {contract.instrumentDescription}
              </option>
            ))}
          </Select>
        </FormField>
      )}

      <FormField label="Service type" htmlFor="type" error={state.errors?.type} required>
        <Select id="type" name="type" defaultValue={ServiceRequestType.BREAKDOWN} required>
          {Object.values(ServiceRequestType).map((type) => (
            <option key={type} value={type}>
              {SERVICE_REQUEST_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Priority" htmlFor="priority" error={state.errors?.priority} required>
        <Select id="priority" name="priority" defaultValue={Priority.NORMAL} required>
          {Object.values(Priority).map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Instrument"
        htmlFor="instrumentDescription"
        error={state.errors?.instrumentDescription}
        hint="Model and serial number, if known"
        required
      >
        <Input id="instrumentDescription" name="instrumentDescription" placeholder="e.g. Shimadzu LC-2030C Plus, S/N 12345" required />
      </FormField>

      <FormField label="Describe the issue" htmlFor="description" error={state.errors?.description} required>
        <Textarea id="description" name="description" rows={5} required />
      </FormField>

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? 'Submitting…' : 'Submit Request'}
      </Button>
    </form>
  );
}
