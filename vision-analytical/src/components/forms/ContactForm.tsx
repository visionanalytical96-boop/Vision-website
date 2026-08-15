'use client';

import { useActionState } from 'react';
import { submitContactMessage, type ContactFormState } from '@/lib/actions/contact';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';

const initialState: ContactFormState = {};

export function ContactForm({ defaultSubject }: { defaultSubject?: string }) {
  const [state, formAction, pending] = useActionState(submitContactMessage, initialState);

  if (state.success) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="font-display text-lg font-semibold text-foreground">Message sent</p>
        <p className="mt-2 text-sm text-muted">
          Thanks for reaching out - our team will get back to you shortly by email or phone.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField label="Name" htmlFor="name" error={state.errors?.name} required>
        <Input id="name" name="name" autoComplete="name" required />
      </FormField>
      <FormField label="Email" htmlFor="email" error={state.errors?.email} required>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </FormField>
      <FormField label="Phone" htmlFor="phone" error={state.errors?.phone}>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" />
      </FormField>
      <FormField label="Subject" htmlFor="subject" error={state.errors?.subject}>
        <Input id="subject" name="subject" defaultValue={defaultSubject} />
      </FormField>
      <FormField label="Message" htmlFor="message" error={state.errors?.message} required>
        <Textarea id="message" name="message" rows={5} required />
      </FormField>

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? 'Sending…' : 'Send Message'}
      </Button>
    </form>
  );
}
