'use client';

import { useActionState, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { updatePageContent, type CmsFormState } from '@/lib/actions/admin-cms';
import { ContentPageKey } from '@/generated/prisma/enums';
import type { FooterContent } from '@/lib/cms/schemas';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';

const initialState: CmsFormState = {};
const boundAction = updatePageContent.bind(null, ContentPageKey.FOOTER);

function LinkListEditor({
  title,
  links,
  onChange,
  idPrefix,
}: {
  title: string;
  links: FooterContent['categoryLinks'];
  onChange: (links: FooterContent['categoryLinks']) => void;
  idPrefix: string;
}) {
  return (
    <section className="space-y-3">
      <p className="font-display text-sm font-semibold text-foreground">{title}</p>
      {links.map((link, index) => (
        <div key={index} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <FormField label="Label" htmlFor={`${idPrefix}-label-${index}`}>
              <Input
                id={`${idPrefix}-label-${index}`}
                value={link.label}
                onChange={(event) => onChange(links.map((l, i) => (i === index ? { ...l, label: event.target.value } : l)))}
              />
            </FormField>
            <FormField label="Link" htmlFor={`${idPrefix}-href-${index}`}>
              <Input
                id={`${idPrefix}-href-${index}`}
                value={link.href}
                onChange={(event) => onChange(links.map((l, i) => (i === index ? { ...l, href: event.target.value } : l)))}
              />
            </FormField>
          </div>
          <button
            type="button"
            onClick={() => onChange(links.filter((_, i) => i !== index))}
            aria-label="Remove link"
            className="mt-1 h-8 w-8 shrink-0 rounded-lg text-danger hover:bg-danger-bg"
          >
            <Trash2 className="mx-auto h-4 w-4" />
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...links, { label: '', href: '' }])}>
        <Plus className="h-4 w-4" />
        Add link
      </Button>
    </section>
  );
}

export function FooterContentForm({ content }: { content: FooterContent }) {
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [form, setForm] = useState(content);

  function set<K extends keyof FooterContent>(key: K, value: FooterContent[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form action={formAction} className="max-w-2xl space-y-8">
      <input type="hidden" name="contentJson" value={JSON.stringify(form)} readOnly />

      <FormField label="Tagline" htmlFor="tagline">
        <Textarea id="tagline" rows={2} value={form.tagline} onChange={(event) => set('tagline', event.target.value)} />
      </FormField>

      <FormField label="Company column heading" htmlFor="companyColumnHeading">
        <Input
          id="companyColumnHeading"
          value={form.companyColumnHeading}
          onChange={(event) => set('companyColumnHeading', event.target.value)}
        />
      </FormField>

      <FormField label="Category column heading" htmlFor="categoryColumnHeading">
        <Input
          id="categoryColumnHeading"
          value={form.categoryColumnHeading}
          onChange={(event) => set('categoryColumnHeading', event.target.value)}
        />
      </FormField>
      <LinkListEditor title="Category links" links={form.categoryLinks} onChange={(links) => set('categoryLinks', links)} idPrefix="category" />

      <FormField label="Service column heading" htmlFor="serviceColumnHeading">
        <Input
          id="serviceColumnHeading"
          value={form.serviceColumnHeading}
          onChange={(event) => set('serviceColumnHeading', event.target.value)}
        />
      </FormField>
      <LinkListEditor title="Service links" links={form.serviceLinks} onChange={(links) => set('serviceLinks', links)} idPrefix="service" />

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}
      {state.success && <p className="text-sm text-success">Saved.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save Footer'}
      </Button>
    </form>
  );
}
