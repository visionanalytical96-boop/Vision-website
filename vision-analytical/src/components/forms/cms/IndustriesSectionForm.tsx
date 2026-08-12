'use client';

import { useActionState, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { updateHomeSection, type CmsFormState } from '@/lib/actions/admin-cms';
import { HomeSectionKey } from '@/generated/prisma/enums';
import type { IndustriesContent } from '@/lib/cms/schemas';
import { ICON_KEYS, DEFAULT_ICON_KEY } from '@/lib/cms/icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';

const initialState: CmsFormState = {};
const boundAction = updateHomeSection.bind(null, HomeSectionKey.INDUSTRIES);

export function IndustriesSectionForm({ content }: { content: IndustriesContent }) {
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [form, setForm] = useState(content);

  function updateIndustry(index: number, patch: Partial<IndustriesContent['industries'][number]>) {
    setForm((prev) => ({
      ...prev,
      industries: prev.industries.map((industry, i) => (i === index ? { ...industry, ...patch } : industry)),
    }));
  }

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      <input type="hidden" name="contentJson" value={JSON.stringify(form)} readOnly />

      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      <div className="space-y-4">
        {form.industries.map((industry, index) => (
          <div key={index} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <FormField label="Industry" htmlFor={`industry-name-${index}`}>
                <Input
                  id={`industry-name-${index}`}
                  value={industry.name}
                  onChange={(event) => updateIndustry(index, { name: event.target.value })}
                />
              </FormField>
              <FormField label="Icon" htmlFor={`industry-icon-${index}`}>
                <Select
                  id={`industry-icon-${index}`}
                  value={industry.iconKey}
                  onChange={(event) => updateIndustry(index, { iconKey: event.target.value })}
                >
                  {ICON_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Description" htmlFor={`industry-description-${index}`} className="sm:col-span-2">
                <Textarea
                  id={`industry-description-${index}`}
                  rows={2}
                  value={industry.description}
                  onChange={(event) => updateIndustry(index, { description: event.target.value })}
                />
              </FormField>
            </div>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, industries: prev.industries.filter((_, i) => i !== index) }))}
              aria-label={`Remove ${industry.name || `industry ${index + 1}`}`}
              className="mt-1 h-8 w-8 shrink-0 rounded-lg text-danger hover:bg-danger-bg"
            >
              <Trash2 className="mx-auto h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          setForm((prev) => ({
            ...prev,
            industries: [...prev.industries, { name: '', description: '', iconKey: DEFAULT_ICON_KEY }],
          }))
        }
      >
        <Plus className="h-4 w-4" />
        Add industry
      </Button>

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}
      {state.success && <p className="text-sm text-success">Saved.</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save Industries Section'}
        </Button>
      </div>
    </form>
  );
}
