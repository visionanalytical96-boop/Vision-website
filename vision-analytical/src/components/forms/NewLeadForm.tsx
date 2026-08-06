'use client';

import { useActionState } from 'react';
import { createLead, type LeadFormState } from '@/lib/actions/admin-crm';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';

const initialState: LeadFormState = {};

interface StaffOption {
  id: string;
  name: string;
  role: string;
}

export function NewLeadForm({ staff }: { staff: StaffOption[] }) {
  const [state, formAction, pending] = useActionState(createLead, initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <FormField label="Name" htmlFor="name" error={state.errors?.name} required className="sm:col-span-2">
        <Input id="name" name="name" required />
      </FormField>
      <FormField label="Company" htmlFor="company" error={state.errors?.company}>
        <Input id="company" name="company" />
      </FormField>
      <FormField label="Source" htmlFor="source" error={state.errors?.source} hint="e.g. Website, referral, exhibition">
        <Input id="source" name="source" />
      </FormField>
      <FormField label="Email" htmlFor="email" error={state.errors?.email}>
        <Input id="email" name="email" type="email" />
      </FormField>
      <FormField label="Phone" htmlFor="phone" error={state.errors?.phone}>
        <Input id="phone" name="phone" type="tel" />
      </FormField>
      <FormField label="Assign to" htmlFor="assignedToId" error={state.errors?.assignedToId} className="sm:col-span-2">
        <Select id="assignedToId" name="assignedToId" defaultValue="">
          <option value="">Unassigned</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Notes" htmlFor="notes" error={state.errors?.notes} className="sm:col-span-2">
        <Textarea id="notes" name="notes" rows={3} />
      </FormField>

      {state.formError && <p className="text-sm text-danger sm:col-span-2">{state.formError}</p>}

      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? 'Saving…' : 'Add Lead'}
      </Button>
    </form>
  );
}
