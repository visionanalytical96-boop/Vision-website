'use client';

import { useActionState, useState } from 'react';
import { updateHomeSection, type CmsFormState } from '@/lib/actions/admin-cms';
import { HomeSectionKey } from '@/generated/prisma/enums';
import type { CategoriesContent } from '@/lib/cms/schemas';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';

const initialState: CmsFormState = {};
const boundAction = updateHomeSection.bind(null, HomeSectionKey.CATEGORIES);

export function CategoriesSectionForm({ content }: { content: CategoriesContent }) {
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [form, setForm] = useState(content);

  return (
    <form action={formAction} className="grid max-w-xl gap-4">
      <input type="hidden" name="contentJson" value={JSON.stringify(form)} readOnly />

      <FormField label="Heading" htmlFor="heading">
        <Input id="heading" value={form.heading} onChange={(event) => setForm((prev) => ({ ...prev, heading: event.target.value }))} />
      </FormField>
      <FormField label="Subheading" htmlFor="subheading">
        <Input id="subheading" value={form.subheading} onChange={(event) => setForm((prev) => ({ ...prev, subheading: event.target.value }))} />
      </FormField>

      <p className="text-sm text-muted">The category cards themselves are pulled live from your Product Catalog categories.</p>

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}
      {state.success && <p className="text-sm text-success">Saved.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save Section'}
      </Button>
    </form>
  );
}
