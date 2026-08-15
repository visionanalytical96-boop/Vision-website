'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { updateHomeSection, type CmsFormState } from '@/lib/actions/admin-cms';
import { HomeSectionKey } from '@/generated/prisma/enums';
import type { ContactBandContent } from '@/lib/cms/schemas';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';

const initialState: CmsFormState = {};
const boundAction = updateHomeSection.bind(null, HomeSectionKey.CONTACT_BAND);

export function ContactBandForm({ content }: { content: ContactBandContent }) {
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [form, setForm] = useState(content);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      <input type="hidden" name="contentJson" value={JSON.stringify(form)} readOnly />

      <FormField label="Heading" htmlFor="heading">
        <Input
          id="heading"
          value={form.heading}
          onChange={(event) => setForm((prev) => ({ ...prev, heading: event.target.value }))}
        />
      </FormField>
      <FormField label="Subheading" htmlFor="subheading">
        <Input
          id="subheading"
          value={form.subheading}
          onChange={(event) => setForm((prev) => ({ ...prev, subheading: event.target.value }))}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Hours label" htmlFor="hoursLabel">
          <Input
            id="hoursLabel"
            value={form.hoursLabel}
            onChange={(event) => setForm((prev) => ({ ...prev, hoursLabel: event.target.value }))}
          />
        </FormField>
        <FormField label="Hours" htmlFor="hoursValue" hint="Leave blank to hide the hours tile.">
          <Input
            id="hoursValue"
            value={form.hoursValue}
            onChange={(event) => setForm((prev) => ({ ...prev, hoursValue: event.target.value }))}
          />
        </FormField>
      </div>

      <p className="text-sm text-muted">
        Phone, WhatsApp, email and address come from{' '}
        <Link href="/admin/website/settings" className="text-primary hover:underline dark:text-secondary">
          Business Settings
        </Link>{' '}
        so there is only one place to change them.
      </p>

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}
      {state.success && <p className="text-sm text-success">Saved.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save Contact Band'}
      </Button>
    </form>
  );
}
