'use client';

import { useActionState, useState } from 'react';
import { updateSiteSettings, type CmsFormState } from '@/lib/actions/admin-cms';
import type { SiteSettingsInput } from '@/lib/cms/schemas';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';
import { ImageInput } from '@/components/ui/ImageInput';

const initialState: CmsFormState = {};

export function BusinessSettingsForm({ settings }: { settings: SiteSettingsInput }) {
  const [state, formAction, pending] = useActionState(updateSiteSettings, initialState);
  const [form, setForm] = useState(settings);

  function set<K extends keyof SiteSettingsInput>(key: K, value: SiteSettingsInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form action={formAction} className="max-w-3xl space-y-8">
      <input type="hidden" name="logoUrl" value={form.logoUrl ?? ''} readOnly />
      <input type="hidden" name="faviconUrl" value={form.faviconUrl ?? ''} readOnly />

      <section className="space-y-4">
        <p className="font-display text-sm font-semibold text-foreground">Company details</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Company name" htmlFor="companyName">
            <Input id="companyName" name="companyName" value={form.companyName} onChange={(event) => set('companyName', event.target.value)} />
          </FormField>
          <FormField label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" value={form.email ?? ''} onChange={(event) => set('email', event.target.value)} />
          </FormField>
          <FormField label="Phone" htmlFor="phone" hint="Include country code, e.g. +91XXXXXXXXXX">
            <Input id="phone" name="phone" value={form.phone ?? ''} onChange={(event) => set('phone', event.target.value)} />
          </FormField>
          <FormField label="WhatsApp number" htmlFor="whatsappNumber" hint="Digits only with country code, e.g. 91XXXXXXXXXX">
            <Input id="whatsappNumber" name="whatsappNumber" value={form.whatsappNumber ?? ''} onChange={(event) => set('whatsappNumber', event.target.value)} />
          </FormField>
          <FormField label="Address line" htmlFor="addressLine" className="sm:col-span-2">
            <Input id="addressLine" name="addressLine" value={form.addressLine ?? ''} onChange={(event) => set('addressLine', event.target.value)} />
          </FormField>
          <FormField label="City" htmlFor="city">
            <Input id="city" name="city" value={form.city ?? ''} onChange={(event) => set('city', event.target.value)} />
          </FormField>
          <FormField label="State" htmlFor="state">
            <Input id="state" name="state" value={form.state ?? ''} onChange={(event) => set('state', event.target.value)} />
          </FormField>
          <FormField label="Country" htmlFor="country">
            <Input id="country" name="country" value={form.country} onChange={(event) => set('country', event.target.value)} />
          </FormField>
        </div>
      </section>

      <section className="space-y-4">
        <p className="font-display text-sm font-semibold text-foreground">Social links</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Facebook URL" htmlFor="facebookUrl">
            <Input id="facebookUrl" name="facebookUrl" value={form.facebookUrl ?? ''} onChange={(event) => set('facebookUrl', event.target.value)} />
          </FormField>
          <FormField label="Instagram URL" htmlFor="instagramUrl">
            <Input id="instagramUrl" name="instagramUrl" value={form.instagramUrl ?? ''} onChange={(event) => set('instagramUrl', event.target.value)} />
          </FormField>
          <FormField label="LinkedIn URL" htmlFor="linkedinUrl">
            <Input id="linkedinUrl" name="linkedinUrl" value={form.linkedinUrl ?? ''} onChange={(event) => set('linkedinUrl', event.target.value)} />
          </FormField>
          <FormField label="YouTube URL" htmlFor="youtubeUrl">
            <Input id="youtubeUrl" name="youtubeUrl" value={form.youtubeUrl ?? ''} onChange={(event) => set('youtubeUrl', event.target.value)} />
          </FormField>
        </div>
      </section>

      <section className="space-y-4">
        <p className="font-display text-sm font-semibold text-foreground">SEO defaults</p>
        <FormField label="Default page title" htmlFor="seoDefaultTitle" hint="Used when a page doesn't set its own title.">
          <Input id="seoDefaultTitle" name="seoDefaultTitle" value={form.seoDefaultTitle ?? ''} onChange={(event) => set('seoDefaultTitle', event.target.value)} />
        </FormField>
        <FormField label="Default meta description" htmlFor="seoDefaultDescription">
          <Textarea
            id="seoDefaultDescription"
            name="seoDefaultDescription"
            rows={3}
            value={form.seoDefaultDescription ?? ''}
            onChange={(event) => set('seoDefaultDescription', event.target.value)}
          />
        </FormField>
      </section>

      <section className="space-y-4">
        <p className="font-display text-sm font-semibold text-foreground">Branding</p>
        <div className="grid gap-6 sm:grid-cols-2">
          <ImageInput name="logoImage" label="Logo" defaultImageUrl={form.logoUrl} hint="Shown in the header and footer instead of the text wordmark." />
          <ImageInput name="faviconImage" label="Favicon" defaultImageUrl={form.faviconUrl} hint="Shown as the browser tab icon." />
        </div>
      </section>

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}
      {state.success && <p className="text-sm text-success">Saved.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save Business Settings'}
      </Button>
    </form>
  );
}
