'use client';

import { useActionState, useState } from 'react';
import { updateHomeSection, type CmsFormState } from '@/lib/actions/admin-cms';
import { HomeSectionKey } from '@/generated/prisma/enums';
import type { HeroContent } from '@/lib/cms/schemas';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';
import { ImageInput } from '@/components/ui/ImageInput';

const initialState: CmsFormState = {};
const boundAction = updateHomeSection.bind(null, HomeSectionKey.HERO);

export function HeroSectionForm({ content }: { content: HeroContent }) {
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [form, setForm] = useState(content);

  function set<K extends keyof HeroContent>(key: K, value: HeroContent[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form action={formAction} className="grid max-w-3xl gap-4 sm:grid-cols-2">
      <input type="hidden" name="contentJson" value={JSON.stringify(form)} readOnly />

      <div className="sm:col-span-2">
        <ImageInput name="image" label="Background image" defaultImageUrl={form.backgroundImage} hint="JPEG, PNG or WebP, up to 8MB. Optional." />
      </div>

      <FormField label="Eyebrow text" htmlFor="eyebrow" className="sm:col-span-2">
        <Input id="eyebrow" value={form.eyebrow} onChange={(event) => set('eyebrow', event.target.value)} />
      </FormField>

      <FormField label="Heading - before highlight" htmlFor="headingPrefix">
        <Input id="headingPrefix" value={form.headingPrefix} onChange={(event) => set('headingPrefix', event.target.value)} />
      </FormField>
      <FormField label="Heading - highlighted phrase" htmlFor="headingHighlight">
        <Input id="headingHighlight" value={form.headingHighlight} onChange={(event) => set('headingHighlight', event.target.value)} />
      </FormField>
      <FormField label="Heading - after highlight" htmlFor="headingSuffix" className="sm:col-span-2">
        <Input id="headingSuffix" value={form.headingSuffix} onChange={(event) => set('headingSuffix', event.target.value)} />
      </FormField>

      <FormField label="Subheading" htmlFor="subheading" className="sm:col-span-2">
        <Textarea id="subheading" rows={3} value={form.subheading} onChange={(event) => set('subheading', event.target.value)} />
      </FormField>

      <FormField label="Primary button label" htmlFor="primaryButtonLabel">
        <Input id="primaryButtonLabel" value={form.primaryButtonLabel} onChange={(event) => set('primaryButtonLabel', event.target.value)} />
      </FormField>
      <FormField label="Primary button link" htmlFor="primaryButtonHref">
        <Input id="primaryButtonHref" value={form.primaryButtonHref} onChange={(event) => set('primaryButtonHref', event.target.value)} />
      </FormField>
      <FormField label="Secondary button label" htmlFor="secondaryButtonLabel">
        <Input id="secondaryButtonLabel" value={form.secondaryButtonLabel} onChange={(event) => set('secondaryButtonLabel', event.target.value)} />
      </FormField>
      <FormField label="Secondary button link" htmlFor="secondaryButtonHref">
        <Input id="secondaryButtonHref" value={form.secondaryButtonHref} onChange={(event) => set('secondaryButtonHref', event.target.value)} />
      </FormField>

      <FormField label="Offering badges" htmlFor="badges" hint="Comma-separated" className="sm:col-span-2">
        <Input
          id="badges"
          value={form.badges.join(', ')}
          onChange={(event) => set('badges', event.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
        />
      </FormField>
      <FormField label="Brand names" htmlFor="brands" hint="Comma-separated" className="sm:col-span-2">
        <Input
          id="brands"
          value={form.brands.join(', ')}
          onChange={(event) => set('brands', event.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
        />
      </FormField>

      {state.formError && <p className="text-sm text-danger sm:col-span-2">{state.formError}</p>}
      {state.success && <p className="text-sm text-success sm:col-span-2">Saved.</p>}

      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? 'Saving…' : 'Save Hero Section'}
      </Button>
    </form>
  );
}
