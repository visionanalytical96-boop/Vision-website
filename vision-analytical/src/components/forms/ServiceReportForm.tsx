'use client';

import { useActionState } from 'react';
import { submitServiceReport, type ServiceReportFormState } from '@/lib/actions/engineer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';

const initialState: ServiceReportFormState = {};

export function ServiceReportForm({ jobId }: { jobId: string }) {
  const [state, formAction, pending] = useActionState(submitServiceReport, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="jobId" value={jobId} />
      <FormField label="Work performed" htmlFor="workPerformed" error={state.errors?.workPerformed} required>
        <Textarea id="workPerformed" name="workPerformed" rows={4} placeholder="What did you find and do on this visit?" required />
      </FormField>
      <FormField label="Parts used" htmlFor="partsUsed" error={state.errors?.partsUsed} hint="Comma-separated, leave blank if none">
        <Input id="partsUsed" name="partsUsed" placeholder="e.g. Deuterium Lamp, Inlet Seal Kit" />
      </FormField>

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}
      {state.success && <p className="text-sm text-success">Report submitted.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Submitting…' : 'Submit Report'}
      </Button>
    </form>
  );
}
