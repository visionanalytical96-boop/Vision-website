'use client';

import { useActionState, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { updatePageContent, type CmsFormState } from '@/lib/actions/admin-cms';
import { ContentPageKey } from '@/generated/prisma/enums';
import type { AboutContent } from '@/lib/cms/schemas';
import { ICON_KEYS, DEFAULT_ICON_KEY } from '@/lib/cms/icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';

const initialState: CmsFormState = {};
const boundAction = updatePageContent.bind(null, ContentPageKey.ABOUT);

export function AboutPageForm({ content }: { content: AboutContent }) {
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [form, setForm] = useState(content);

  function set<K extends keyof AboutContent>(key: K, value: AboutContent[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form action={formAction} className="max-w-3xl space-y-8">
      <input type="hidden" name="contentJson" value={JSON.stringify(form)} readOnly />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Eyebrow text" htmlFor="eyebrow">
          <Input id="eyebrow" value={form.eyebrow} onChange={(event) => set('eyebrow', event.target.value)} />
        </FormField>
        <FormField label="Heading" htmlFor="heading">
          <Input id="heading" value={form.heading} onChange={(event) => set('heading', event.target.value)} />
        </FormField>
        <FormField label="Subheading" htmlFor="subheading" className="sm:col-span-2">
          <Textarea id="subheading" rows={3} value={form.subheading} onChange={(event) => set('subheading', event.target.value)} />
        </FormField>
      </div>

      <section className="space-y-3">
        <p className="font-display text-sm font-semibold text-foreground">Facts</p>
        {form.facts.map((fact, index) => (
          <div key={index} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
            <div className="grid flex-1 gap-3 sm:grid-cols-3">
              <FormField label="Label" htmlFor={`fact-label-${index}`}>
                <Input
                  id={`fact-label-${index}`}
                  value={fact.label}
                  onChange={(event) =>
                    set(
                      'facts',
                      form.facts.map((f, i) => (i === index ? { ...f, label: event.target.value } : f)),
                    )
                  }
                />
              </FormField>
              <FormField label="Value" htmlFor={`fact-value-${index}`}>
                <Input
                  id={`fact-value-${index}`}
                  value={fact.value}
                  onChange={(event) =>
                    set(
                      'facts',
                      form.facts.map((f, i) => (i === index ? { ...f, value: event.target.value } : f)),
                    )
                  }
                />
              </FormField>
              <FormField label="Icon" htmlFor={`fact-icon-${index}`}>
                <Select
                  id={`fact-icon-${index}`}
                  value={fact.iconKey}
                  onChange={(event) =>
                    set(
                      'facts',
                      form.facts.map((f, i) => (i === index ? { ...f, iconKey: event.target.value } : f)),
                    )
                  }
                >
                  {ICON_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <button
              type="button"
              onClick={() => set('facts', form.facts.filter((_, i) => i !== index))}
              aria-label="Remove fact"
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
          onClick={() => set('facts', [...form.facts, { label: '', value: '', iconKey: DEFAULT_ICON_KEY }])}
        >
          <Plus className="h-4 w-4" />
          Add fact
        </Button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <p className="font-display text-sm font-semibold text-foreground sm:col-span-2">Brands</p>
        <FormField label="Brands heading" htmlFor="brandsHeading">
          <Input id="brandsHeading" value={form.brandsHeading} onChange={(event) => set('brandsHeading', event.target.value)} />
        </FormField>
        <FormField label="Brands subheading" htmlFor="brandsSubheading">
          <Input id="brandsSubheading" value={form.brandsSubheading} onChange={(event) => set('brandsSubheading', event.target.value)} />
        </FormField>
        <FormField label="Brand names" htmlFor="brands" hint="Comma-separated" className="sm:col-span-2">
          <Input
            id="brands"
            value={form.brands.join(', ')}
            onChange={(event) => set('brands', event.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
          />
        </FormField>
      </section>

      <section className="space-y-3">
        <p className="font-display text-sm font-semibold text-foreground">Industries</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Industries heading" htmlFor="industriesHeading">
            <Input id="industriesHeading" value={form.industriesHeading} onChange={(event) => set('industriesHeading', event.target.value)} />
          </FormField>
          <FormField label="Industries subheading" htmlFor="industriesSubheading">
            <Input
              id="industriesSubheading"
              value={form.industriesSubheading}
              onChange={(event) => set('industriesSubheading', event.target.value)}
            />
          </FormField>
        </div>
        {form.industries.map((industry, index) => (
          <div key={index} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <FormField label="Name" htmlFor={`industry-name-${index}`}>
                <Input
                  id={`industry-name-${index}`}
                  value={industry.name}
                  onChange={(event) =>
                    set(
                      'industries',
                      form.industries.map((it, i) => (i === index ? { ...it, name: event.target.value } : it)),
                    )
                  }
                />
              </FormField>
              <FormField label="Icon" htmlFor={`industry-icon-${index}`}>
                <Select
                  id={`industry-icon-${index}`}
                  value={industry.iconKey}
                  onChange={(event) =>
                    set(
                      'industries',
                      form.industries.map((it, i) => (i === index ? { ...it, iconKey: event.target.value } : it)),
                    )
                  }
                >
                  {ICON_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <button
              type="button"
              onClick={() => set('industries', form.industries.filter((_, i) => i !== index))}
              aria-label="Remove industry"
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
          onClick={() => set('industries', [...form.industries, { name: '', iconKey: DEFAULT_ICON_KEY }])}
        >
          <Plus className="h-4 w-4" />
          Add industry
        </Button>
      </section>

      <section className="space-y-3">
        <FormField label="Why Us heading" htmlFor="whyUsHeading">
          <Input id="whyUsHeading" value={form.whyUsHeading} onChange={(event) => set('whyUsHeading', event.target.value)} />
        </FormField>
        {form.whyUs.map((item, index) => (
          <div key={index} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <FormField label="Title" htmlFor={`whyus-title-${index}`}>
                <Input
                  id={`whyus-title-${index}`}
                  value={item.title}
                  onChange={(event) =>
                    set(
                      'whyUs',
                      form.whyUs.map((w, i) => (i === index ? { ...w, title: event.target.value } : w)),
                    )
                  }
                />
              </FormField>
              <FormField label="Icon" htmlFor={`whyus-icon-${index}`}>
                <Select
                  id={`whyus-icon-${index}`}
                  value={item.iconKey}
                  onChange={(event) =>
                    set(
                      'whyUs',
                      form.whyUs.map((w, i) => (i === index ? { ...w, iconKey: event.target.value } : w)),
                    )
                  }
                >
                  {ICON_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Description" htmlFor={`whyus-description-${index}`} className="sm:col-span-2">
                <Textarea
                  id={`whyus-description-${index}`}
                  rows={2}
                  value={item.description}
                  onChange={(event) =>
                    set(
                      'whyUs',
                      form.whyUs.map((w, i) => (i === index ? { ...w, description: event.target.value } : w)),
                    )
                  }
                />
              </FormField>
            </div>
            <button
              type="button"
              onClick={() => set('whyUs', form.whyUs.filter((_, i) => i !== index))}
              aria-label="Remove why-us item"
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
          onClick={() => set('whyUs', [...form.whyUs, { title: '', description: '', iconKey: DEFAULT_ICON_KEY }])}
        >
          <Plus className="h-4 w-4" />
          Add item
        </Button>
      </section>

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}
      {state.success && <p className="text-sm text-success">Saved.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save About Page'}
      </Button>
    </form>
  );
}
