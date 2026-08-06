'use client';

import { useActionState } from 'react';
import { logActivity, type LogActivityFormState } from '@/lib/actions/admin-crm';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { CrmActivityType } from '@/generated/prisma/enums';
import { CRM_ACTIVITY_TYPE_LABELS } from '@/lib/crm-labels';

const initialState: LogActivityFormState = {};

export function LogActivityForm({ leadId }: { leadId: string }) {
  const [state, formAction, pending] = useActionState(logActivity, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="leadId" value={leadId} />
      <div className="flex gap-3">
        <FormField label="Type" htmlFor="type" error={state.errors?.type} className="w-40 shrink-0">
          <Select id="type" name="type" defaultValue={CrmActivityType.NOTE}>
            {Object.values(CrmActivityType).map((type) => (
              <option key={type} value={type}>
                {CRM_ACTIVITY_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Notes" htmlFor="notes" error={state.errors?.notes} className="flex-1">
          <Textarea id="notes" name="notes" rows={2} placeholder="What happened?" />
        </FormField>
      </div>

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}

      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Logging…' : 'Log activity'}
      </Button>
    </form>
  );
}
