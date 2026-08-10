'use client';

import { useActionState, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { updatePageContent, type CmsFormState } from '@/lib/actions/admin-cms';
import { ContentPageKey } from '@/generated/prisma/enums';
import type { ServicesContent } from '@/lib/cms/schemas';
import { ICON_KEYS, DEFAULT_ICON_KEY } from '@/lib/cms/icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';

const initialState: CmsFormState = {};
const boundAction = updatePageContent.bind(null, ContentPageKey.SERVICES);

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function ServicesPageForm({ content }: { content: ServicesContent }) {
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [form, setForm] = useState(content);

  function set<K extends keyof ServicesContent>(key: K, value: ServicesContent[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateGroup(groupIndex: number, patch: Partial<ServicesContent['groups'][number]>) {
    set(
      'groups',
      form.groups.map((group, i) => (i === groupIndex ? { ...group, ...patch } : group)),
    );
  }

  function updateService(groupIndex: number, serviceIndex: number, patch: Partial<ServicesContent['groups'][number]['services'][number]>) {
    updateGroup(groupIndex, {
      services: form.groups[groupIndex].services.map((service, i) => (i === serviceIndex ? { ...service, ...patch } : service)),
    });
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
          <Textarea id="subheading" rows={2} value={form.subheading} onChange={(event) => set('subheading', event.target.value)} />
        </FormField>
      </div>

      <section className="space-y-5">
        <p className="font-display text-sm font-semibold text-foreground">Service groups</p>
        {form.groups.map((group, groupIndex) => (
          <div key={groupIndex} className="space-y-3 rounded-xl border border-border bg-surface-muted p-4">
            <div className="flex items-end gap-3">
              <FormField label="Group title" htmlFor={`group-title-${groupIndex}`} className="flex-1">
                <Input
                  id={`group-title-${groupIndex}`}
                  value={group.title}
                  onChange={(event) => updateGroup(groupIndex, { title: event.target.value, id: slugify(event.target.value) || group.id })}
                />
              </FormField>
              <button
                type="button"
                onClick={() => set('groups', form.groups.filter((_, i) => i !== groupIndex))}
                aria-label="Remove group"
                className="mb-1 h-9 w-9 shrink-0 rounded-lg text-danger hover:bg-danger-bg"
              >
                <Trash2 className="mx-auto h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {group.services.map((service, serviceIndex) => (
                <div key={serviceIndex} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
                  <div className="grid flex-1 gap-3 sm:grid-cols-2">
                    <FormField label="Name" htmlFor={`service-name-${groupIndex}-${serviceIndex}`}>
                      <Input
                        id={`service-name-${groupIndex}-${serviceIndex}`}
                        value={service.name}
                        onChange={(event) => updateService(groupIndex, serviceIndex, { name: event.target.value })}
                      />
                    </FormField>
                    <FormField label="Icon" htmlFor={`service-icon-${groupIndex}-${serviceIndex}`}>
                      <Select
                        id={`service-icon-${groupIndex}-${serviceIndex}`}
                        value={service.iconKey}
                        onChange={(event) => updateService(groupIndex, serviceIndex, { iconKey: event.target.value })}
                      >
                        {ICON_KEYS.map((key) => (
                          <option key={key} value={key}>
                            {key}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="Description" htmlFor={`service-description-${groupIndex}-${serviceIndex}`} className="sm:col-span-2">
                      <Textarea
                        id={`service-description-${groupIndex}-${serviceIndex}`}
                        rows={2}
                        value={service.description}
                        onChange={(event) => updateService(groupIndex, serviceIndex, { description: event.target.value })}
                      />
                    </FormField>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateGroup(groupIndex, { services: group.services.filter((_, i) => i !== serviceIndex) })}
                    aria-label="Remove service"
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
                onClick={() =>
                  updateGroup(groupIndex, { services: [...group.services, { name: '', description: '', iconKey: DEFAULT_ICON_KEY }] })
                }
              >
                <Plus className="h-4 w-4" />
                Add service
              </Button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => set('groups', [...form.groups, { id: `group-${form.groups.length}`, title: '', services: [] }])}
        >
          <Plus className="h-4 w-4" />
          Add group
        </Button>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <p className="font-display text-sm font-semibold text-foreground sm:col-span-2">Bottom call-to-action</p>
        <FormField label="CTA heading" htmlFor="ctaHeading">
          <Input id="ctaHeading" value={form.ctaHeading} onChange={(event) => set('ctaHeading', event.target.value)} />
        </FormField>
        <FormField label="CTA subheading" htmlFor="ctaSubheading">
          <Input id="ctaSubheading" value={form.ctaSubheading} onChange={(event) => set('ctaSubheading', event.target.value)} />
        </FormField>
        <FormField label="CTA button label" htmlFor="ctaButtonLabel">
          <Input id="ctaButtonLabel" value={form.ctaButtonLabel} onChange={(event) => set('ctaButtonLabel', event.target.value)} />
        </FormField>
      </div>

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}
      {state.success && <p className="text-sm text-success">Saved.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save Services Page'}
      </Button>
    </form>
  );
}
