'use client';

import { useActionState } from 'react';
import { createAmcContract, type AmcContractFormState } from '@/lib/actions/admin-amc';
import { AmcType } from '@/generated/prisma/enums';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';

const initialState: AmcContractFormState = {};

interface CustomerOption {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
}

export function NewAmcContractForm({ customers }: { customers: CustomerOption[] }) {
  const [state, formAction, pending] = useActionState(createAmcContract, initialState);

  return (
    <form action={formAction} className="grid max-w-2xl gap-4 sm:grid-cols-2">
      <FormField label="Customer" htmlFor="customerId" error={state.errors?.customerId} required className="sm:col-span-2">
        <Select id="customerId" name="customerId" defaultValue="" required>
          <option value="">Select a customer…</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.companyName ?? customer.name} ({customer.email})
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Contract type" htmlFor="type" error={state.errors?.type} required>
        <Select id="type" name="type" defaultValue={AmcType.AMC} required>
          <option value={AmcType.AMC}>AMC (Annual Maintenance Contract)</option>
          <option value={AmcType.CMC}>CMC (Comprehensive Maintenance Contract)</option>
        </Select>
      </FormField>

      <FormField label="Visits included" htmlFor="visitsIncluded" error={state.errors?.visitsIncluded} required>
        <Input id="visitsIncluded" name="visitsIncluded" type="number" min="1" step="1" defaultValue={4} required />
      </FormField>

      <FormField
        label="Instrument"
        htmlFor="instrumentDescription"
        error={state.errors?.instrumentDescription}
        hint="Model and serial number"
        required
        className="sm:col-span-2"
      >
        <Input id="instrumentDescription" name="instrumentDescription" placeholder="e.g. Shimadzu LC-2030C Plus, S/N 12345" required />
      </FormField>

      <FormField label="Start date" htmlFor="startDate" error={state.errors?.startDate} required>
        <Input id="startDate" name="startDate" type="date" required />
      </FormField>
      <FormField label="End date" htmlFor="endDate" error={state.errors?.endDate} required>
        <Input id="endDate" name="endDate" type="date" required />
      </FormField>

      <FormField label="Contract value (₹)" htmlFor="priceRupees" error={state.errors?.priceRupees} hint="Optional">
        <Input id="priceRupees" name="priceRupees" type="number" min="0" step="0.01" />
      </FormField>

      {state.formError && <p className="text-sm text-danger sm:col-span-2">{state.formError}</p>}

      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? 'Creating…' : 'Create Contract'}
      </Button>
    </form>
  );
}
