'use client';

import { useActionState, useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { updateHomeSection, type CmsFormState } from '@/lib/actions/admin-cms';
import type { HomeSectionKey } from '@/generated/prisma/enums';
import type { CardsContent } from '@/lib/cms/schemas';
import { ICON_KEYS, DEFAULT_ICON_KEY } from '@/lib/cms/icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';

const initialState: CmsFormState = {};

interface CardsSectionFormProps {
  sectionKey: HomeSectionKey;
  content: CardsContent;
  submitLabel: string;
  showLinks?: boolean;
}

export function CardsSectionForm({ sectionKey, content, submitLabel, showLinks = false }: CardsSectionFormProps) {
  const boundAction = updateHomeSection.bind(null, sectionKey);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [form, setForm] = useState(content);

  function addCard() {
    setForm((prev) => ({
      ...prev,
      cards: [...prev.cards, { title: '', description: '', iconKey: DEFAULT_ICON_KEY, href: showLinks ? '' : undefined }],
    }));
  }

  function removeCard(index: number) {
    setForm((prev) => ({ ...prev, cards: prev.cards.filter((_, i) => i !== index) }));
  }

  function updateCard(index: number, patch: Partial<CardsContent['cards'][number]>) {
    setForm((prev) => ({
      ...prev,
      cards: prev.cards.map((card, i) => (i === index ? { ...card, ...patch } : card)),
    }));
  }

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      <input type="hidden" name="contentJson" value={JSON.stringify(form)} readOnly />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Heading" htmlFor="heading">
          <Input id="heading" value={form.heading} onChange={(event) => setForm((prev) => ({ ...prev, heading: event.target.value }))} />
        </FormField>
        <FormField label="Subheading" htmlFor="subheading">
          <Input id="subheading" value={form.subheading} onChange={(event) => setForm((prev) => ({ ...prev, subheading: event.target.value }))} />
        </FormField>
      </div>

      <div className="space-y-4">
        {form.cards.map((card, index) => (
          <div key={index} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
            <GripVertical className="mt-2 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <FormField label="Title" htmlFor={`card-title-${index}`}>
                <Input id={`card-title-${index}`} value={card.title} onChange={(event) => updateCard(index, { title: event.target.value })} />
              </FormField>
              <FormField label="Icon" htmlFor={`card-icon-${index}`}>
                <Select id={`card-icon-${index}`} value={card.iconKey} onChange={(event) => updateCard(index, { iconKey: event.target.value })}>
                  {ICON_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Description" htmlFor={`card-description-${index}`} className="sm:col-span-2">
                <Textarea
                  id={`card-description-${index}`}
                  rows={2}
                  value={card.description}
                  onChange={(event) => updateCard(index, { description: event.target.value })}
                />
              </FormField>
              {showLinks && (
                <FormField label="Link" htmlFor={`card-href-${index}`} className="sm:col-span-2">
                  <Input id={`card-href-${index}`} value={card.href ?? ''} onChange={(event) => updateCard(index, { href: event.target.value })} />
                </FormField>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeCard(index)}
              aria-label="Remove card"
              className="mt-1 h-8 w-8 shrink-0 rounded-lg text-danger hover:bg-danger-bg"
            >
              <Trash2 className="mx-auto h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addCard}>
        <Plus className="h-4 w-4" />
        Add card
      </Button>

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}
      {state.success && <p className="text-sm text-success">Saved.</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
