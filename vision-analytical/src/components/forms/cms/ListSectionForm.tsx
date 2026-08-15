'use client';

import { useActionState, useState } from 'react';
import { updateHomeSection, type CmsFormState } from '@/lib/actions/admin-cms';
import type { HomeSectionKey } from '@/generated/prisma/enums';
import type { ListSectionContent } from '@/lib/cms/schemas';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';

const initialState: CmsFormState = {};

/**
 * Editor for the sections whose body is pulled live from the database - the
 * admin controls the wording and the "see everything" link, not the items.
 */
export function ListSectionForm({
  sectionKey,
  content,
  submitLabel,
  note,
}: {
  sectionKey: HomeSectionKey;
  content: ListSectionContent;
  submitLabel: string;
  note: string;
}) {
  const boundAction = updateHomeSection.bind(null, sectionKey);
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
      <FormField label="Subheading" htmlFor="subheading" hint="Leave blank to hide it.">
        <Input
          id="subheading"
          value={form.subheading}
          onChange={(event) => setForm((prev) => ({ ...prev, subheading: event.target.value }))}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Link label" htmlFor="viewAllLabel">
          <Input
            id="viewAllLabel"
            value={form.viewAllLabel}
            onChange={(event) => setForm((prev) => ({ ...prev, viewAllLabel: event.target.value }))}
          />
        </FormField>
        <FormField label="Link URL" htmlFor="viewAllHref">
          <Input
            id="viewAllHref"
            value={form.viewAllHref}
            onChange={(event) => setForm((prev) => ({ ...prev, viewAllHref: event.target.value }))}
          />
        </FormField>
      </div>

      <p className="text-sm text-muted">{note}</p>

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}
      {state.success && <p className="text-sm text-success">Saved.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}
