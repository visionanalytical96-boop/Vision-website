'use client';

import { useActionState, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { updateHomeSection, type CmsFormState } from '@/lib/actions/admin-cms';
import { HomeSectionKey } from '@/generated/prisma/enums';
import type { OverviewContent } from '@/lib/cms/schemas';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';
import { ImageInput } from '@/components/ui/ImageInput';

const initialState: CmsFormState = {};
const boundAction = updateHomeSection.bind(null, HomeSectionKey.COMPANY_OVERVIEW);

export function CompanyOverviewForm({ content }: { content: OverviewContent }) {
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [form, setForm] = useState(content);

  function updateParagraph(index: number, value: string) {
    setForm((prev) => ({ ...prev, body: prev.body.map((paragraph, i) => (i === index ? value : paragraph)) }));
  }

  function updateStat(index: number, patch: Partial<OverviewContent['stats'][number]>) {
    setForm((prev) => ({ ...prev, stats: prev.stats.map((stat, i) => (i === index ? { ...stat, ...patch } : stat)) }));
  }

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      <input type="hidden" name="contentJson" value={JSON.stringify(form)} readOnly />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Eyebrow" htmlFor="eyebrow">
          <Input
            id="eyebrow"
            value={form.eyebrow}
            onChange={(event) => setForm((prev) => ({ ...prev, eyebrow: event.target.value }))}
          />
        </FormField>
        <FormField label="Heading" htmlFor="heading">
          <Input
            id="heading"
            value={form.heading}
            onChange={(event) => setForm((prev) => ({ ...prev, heading: event.target.value }))}
          />
        </FormField>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">Paragraphs</legend>
        {form.body.map((paragraph, index) => (
          <div key={index} className="flex gap-3">
            <Textarea
              aria-label={`Paragraph ${index + 1}`}
              rows={3}
              className="flex-1"
              value={paragraph}
              onChange={(event) => updateParagraph(index, event.target.value)}
            />
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, body: prev.body.filter((_, i) => i !== index) }))}
              aria-label={`Remove paragraph ${index + 1}`}
              className="h-8 w-8 shrink-0 rounded-lg text-danger hover:bg-danger-bg"
            >
              <Trash2 className="mx-auto h-4 w-4" />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setForm((prev) => ({ ...prev, body: [...prev.body, ''] }))}
        >
          <Plus className="h-4 w-4" />
          Add paragraph
        </Button>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">Statistics</legend>
        {form.stats.map((stat, index) => (
          <div key={index} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <FormField label="Value" htmlFor={`stat-value-${index}`}>
                <Input
                  id={`stat-value-${index}`}
                  value={stat.value}
                  onChange={(event) => updateStat(index, { value: event.target.value })}
                />
              </FormField>
              <FormField label="Label" htmlFor={`stat-label-${index}`}>
                <Input
                  id={`stat-label-${index}`}
                  value={stat.label}
                  onChange={(event) => updateStat(index, { label: event.target.value })}
                />
              </FormField>
            </div>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, stats: prev.stats.filter((_, i) => i !== index) }))}
              aria-label={`Remove statistic ${index + 1}`}
              className="mt-1 h-8 w-8 shrink-0 rounded-lg text-danger hover:bg-danger-bg"
            >
              <Trash2 className="mx-auto h-4 w-4" />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setForm((prev) => ({ ...prev, stats: [...prev.stats, { value: '', label: '' }] }))}
        >
          <Plus className="h-4 w-4" />
          Add statistic
        </Button>
      </fieldset>

      <ImageInput name="image" label="Section image" defaultImageUrl={form.image} hint="JPEG, PNG or WebP, up to 8MB. Optional." />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Button label" htmlFor="buttonLabel" hint="Leave blank to hide the button.">
          <Input
            id="buttonLabel"
            value={form.buttonLabel}
            onChange={(event) => setForm((prev) => ({ ...prev, buttonLabel: event.target.value }))}
          />
        </FormField>
        <FormField label="Button URL" htmlFor="buttonHref">
          <Input
            id="buttonHref"
            value={form.buttonHref}
            onChange={(event) => setForm((prev) => ({ ...prev, buttonHref: event.target.value }))}
          />
        </FormField>
      </div>

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}
      {state.success && <p className="text-sm text-success">Saved.</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save Company Overview'}
        </Button>
      </div>
    </form>
  );
}
