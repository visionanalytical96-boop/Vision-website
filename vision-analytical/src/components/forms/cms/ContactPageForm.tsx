'use client';

import { useActionState, useState } from 'react';
import { updatePageContent, type CmsFormState } from '@/lib/actions/admin-cms';
import { ContentPageKey } from '@/generated/prisma/enums';
import type { ContactContent } from '@/lib/cms/schemas';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';

const initialState: CmsFormState = {};
const boundAction = updatePageContent.bind(null, ContentPageKey.CONTACT);

export function ContactPageForm({ content }: { content: ContactContent }) {
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [form, setForm] = useState(content);

  function set<K extends keyof ContactContent>(key: K, value: ContactContent[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form action={formAction} className="grid max-w-xl gap-4">
      <input type="hidden" name="contentJson" value={JSON.stringify(form)} readOnly />

      <FormField label="Heading" htmlFor="heading">
        <Input id="heading" value={form.heading} onChange={(event) => set('heading', event.target.value)} />
      </FormField>
      <FormField label="Subheading" htmlFor="subheading">
        <Textarea id="subheading" rows={2} value={form.subheading} onChange={(event) => set('subheading', event.target.value)} />
      </FormField>
      <FormField label="Emergency box heading" htmlFor="emergencyHeading">
        <Input id="emergencyHeading" value={form.emergencyHeading} onChange={(event) => set('emergencyHeading', event.target.value)} />
      </FormField>
      <FormField label="Emergency box text" htmlFor="emergencyText">
        <Textarea id="emergencyText" rows={2} value={form.emergencyText} onChange={(event) => set('emergencyText', event.target.value)} />
      </FormField>
      <FormField label="Location heading" htmlFor="locationHeading">
        <Input id="locationHeading" value={form.locationHeading} onChange={(event) => set('locationHeading', event.target.value)} />
      </FormField>
      <FormField label="Location text" htmlFor="locationText">
        <Textarea id="locationText" rows={2} value={form.locationText} onChange={(event) => set('locationText', event.target.value)} />
      </FormField>

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}
      {state.success && <p className="text-sm text-success">Saved.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save Contact Page'}
      </Button>
    </form>
  );
}
