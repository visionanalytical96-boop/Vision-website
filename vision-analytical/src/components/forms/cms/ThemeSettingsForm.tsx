'use client';

import { useActionState, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { updateThemeSettings, type CmsFormState } from '@/lib/actions/admin-cms';
import type { ThemeSettingsInput } from '@/lib/cms/schemas';
import { HEADING_FONT_OPTIONS, BODY_FONT_OPTIONS, BUTTON_STYLE_OPTIONS, buttonRadius } from '@/lib/cms/theme';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';

const initialState: CmsFormState = {};

export function ThemeSettingsForm({ settings }: { settings: ThemeSettingsInput }) {
  const [state, formAction, pending] = useActionState(updateThemeSettings, initialState);
  const [form, setForm] = useState(settings);

  function set<K extends keyof ThemeSettingsInput>(key: K, value: ThemeSettingsInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <input type="hidden" name="animationsEnabled" value={String(form.animationsEnabled)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Primary color" htmlFor="primaryColor" hint="Used for buttons, links and icons.">
          <div className="flex items-center gap-3">
            <input
              id="primaryColor"
              name="primaryColor"
              type="color"
              value={form.primaryColor}
              onChange={(event) => set('primaryColor', event.target.value)}
              className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-border bg-surface"
            />
            <span className="font-mono text-sm text-muted">{form.primaryColor}</span>
          </div>
        </FormField>
        <FormField label="Secondary color" htmlFor="secondaryColor" hint="Used as the dark-mode accent.">
          <div className="flex items-center gap-3">
            <input
              id="secondaryColor"
              name="secondaryColor"
              type="color"
              value={form.secondaryColor}
              onChange={(event) => set('secondaryColor', event.target.value)}
              className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-border bg-surface"
            />
            <span className="font-mono text-sm text-muted">{form.secondaryColor}</span>
          </div>
        </FormField>

        <FormField label="Heading font" htmlFor="fontHeading">
          <Select id="fontHeading" name="fontHeading" value={form.fontHeading} onChange={(event) => set('fontHeading', event.target.value)}>
            {HEADING_FONT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Body font" htmlFor="fontBody">
          <Select id="fontBody" name="fontBody" value={form.fontBody} onChange={(event) => set('fontBody', event.target.value)}>
            {BODY_FONT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Button style" htmlFor="buttonStyle">
          <Select id="buttonStyle" name="buttonStyle" value={form.buttonStyle} onChange={(event) => set('buttonStyle', event.target.value)}>
            {BUTTON_STYLE_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="flex items-end pb-2.5">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={form.animationsEnabled}
              onChange={(event) => set('animationsEnabled', event.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            Enable animations &amp; transitions
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-medium text-foreground">Preview</p>
        <div
          className="mt-3 flex flex-wrap items-center gap-3"
          style={{ '--primary': form.primaryColor, '--secondary': form.secondaryColor, '--btn-radius': buttonRadius(form.buttonStyle) } as CSSProperties}
        >
          <span className="inline-flex items-center rounded-[var(--btn-radius)] bg-primary px-4 py-2 text-sm font-medium text-white">
            Primary button
          </span>
          <span className="text-sm font-medium text-primary dark:text-secondary">Accent text example</span>
        </div>
      </div>

      <p className="text-sm text-muted">
        Logo and favicon are managed under{' '}
        <Link href="/admin/website/settings" className="text-primary hover:underline dark:text-secondary">
          Business Settings
        </Link>
        .
      </p>

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}
      {state.success && <p className="text-sm text-success">Saved.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save Theme'}
      </Button>
    </form>
  );
}
