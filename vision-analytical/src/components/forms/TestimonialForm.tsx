'use client';

import { useActionState } from 'react';
import { createTestimonial, updateTestimonial, type AdminFormState } from '@/lib/actions/admin-downloads';
import type { Testimonial } from '@/generated/prisma/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';
import { ImageInput } from '@/components/ui/ImageInput';
import { submittedOr, submittedChecked } from '@/lib/form-values';

const initialState: AdminFormState = {};

export function TestimonialForm({ testimonial }: { testimonial?: Testimonial }) {
  const action = testimonial ? updateTestimonial.bind(null, testimonial.id) : createTestimonial;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid max-w-3xl gap-4 sm:grid-cols-2">
      <FormField
        label="Testimonial"
        htmlFor="quote"
        error={state.errors?.quote}
        required
        className="sm:col-span-2"
        hint="The customer's own words. Get their permission before publishing."
      >
        <Textarea id="quote" name="quote" rows={4} defaultValue={submittedOr(state.values, 'quote', testimonial?.quote)} required />
      </FormField>

      <FormField label="Name" htmlFor="authorName" error={state.errors?.authorName} required>
        <Input id="authorName" name="authorName" defaultValue={submittedOr(state.values, 'authorName', testimonial?.authorName)} required />
      </FormField>

      <FormField label="Job title" htmlFor="authorTitle" error={state.errors?.authorTitle} hint="e.g. QC Manager">
        <Input id="authorTitle" name="authorTitle" defaultValue={submittedOr(state.values, 'authorTitle', testimonial?.authorTitle ?? '')} />
      </FormField>

      <FormField label="Company" htmlFor="company" error={state.errors?.company}>
        <Input id="company" name="company" defaultValue={submittedOr(state.values, 'company', testimonial?.company ?? '')} />
      </FormField>

      <FormField label="Sort order" htmlFor="sortOrder" error={state.errors?.sortOrder} hint="Lower numbers appear first.">
        <Input id="sortOrder" name="sortOrder" type="number" defaultValue={submittedOr(state.values, 'sortOrder', testimonial?.sortOrder ?? 0)} />
      </FormField>

      <div className="sm:col-span-2">
        <ImageInput
          name="logo"
          label="Company logo"
          defaultImageUrl={testimonial?.logoUrl}
          error={state.errors?.logo}
          hint="JPEG, PNG or WebP, up to 8MB. Optional."
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
        <input
          type="checkbox"
          name="isPublished"
          value="true"
          defaultChecked={submittedChecked(state.values, 'isPublished', testimonial?.isPublished ?? true)}
          className="h-4 w-4 rounded border-border"
        />
        Published (visible on the public site)
      </label>

      {state.formError && <p className="text-sm text-danger sm:col-span-2">{state.formError}</p>}

      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? 'Saving…' : testimonial ? 'Save Changes' : 'Add Testimonial'}
      </Button>
    </form>
  );
}
