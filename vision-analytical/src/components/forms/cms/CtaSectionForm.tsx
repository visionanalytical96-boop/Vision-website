'use client';

import { useActionState, useState } from 'react';
import { updateHomeSection, type CmsFormState } from '@/lib/actions/admin-cms';
import { HomeSectionKey } from '@/generated/prisma/enums';
import type { CtaContent } from '@/lib/cms/schemas';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';

const initialState: CmsFormState = {};
const boundAction = updateHomeSection.bind(null, HomeSectionKey.CTA);

export function CtaSectionForm({ content }: { content: CtaContent }) {
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [form, setForm] = useState(content);

  function set<K extends keyof CtaContent>(key: K, value: CtaContent[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form action={formAction} className="grid max-w-xl gap-4">
      <input type="hidden" name="contentJson" value={JSON.stringify(form)} readOnly />

      <FormField label="Heading" htmlFor="heading">
        <Input id="heading" value={form.heading} onChange={(event) => set('heading', event.target.value)} />
      </FormField>
      <FormField label="Subheading" htmlFor="subheading">
        <Input id="subheading" value={form.subheading} onChange={(event) => set('subheading', event.target.value)} />
      </FormField>
      <FormField label="Button label" htmlFor="buttonLabel">
        <Input id="buttonLabel" value={form.buttonLabel} onChange={(event) => set('buttonLabel', event.target.value)} />
      </FormField>
      <FormField label="Button link" htmlFor="buttonHref">
        <Input id="buttonHref" value={form.buttonHref} onChange={(event) => set('buttonHref', event.target.value)} />
      </FormField>

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}
      {state.success && <p className="text-sm text-success">Saved.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save Section'}
      </Button>
    </form>
  );
}
