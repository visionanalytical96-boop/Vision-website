'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import { submitQuoteRequest, type QuoteRequestState } from '@/lib/actions/quotes';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';

const initialState: QuoteRequestState = {};

interface RequestLine {
  name: string;
  quantity: number;
}

/**
 * A quote request for visitors who arrive without a cart. It posts through the
 * same server action as the spare-parts cart, using CUSTOM line items, so both
 * routes land in one Quotes inbox with one reference-number scheme.
 */
export function RequestQuoteForm({
  defaultName,
  defaultEmail,
  defaultPhone,
  defaultRequirement,
}: {
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
  defaultRequirement?: string;
}) {
  const [state, formAction, pending] = useActionState(submitQuoteRequest, initialState);
  const [lines, setLines] = useState<RequestLine[]>([{ name: defaultRequirement ?? '', quantity: 1 }]);

  function updateLine(index: number, patch: Partial<RequestLine>) {
    setLines((previous) => previous.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  if (state.quoteNumber) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="font-display text-2xl font-bold text-foreground">Quote request sent</p>
        <p className="mt-2 text-muted">
          Reference number <span className="font-mono font-medium text-foreground">{state.quoteNumber}</span>. Our team
          will follow up by email or phone with pricing and lead times.
        </p>
        <Link href="/products" className="mt-6 inline-block text-primary hover:underline dark:text-secondary">
          Continue browsing
        </Link>
      </div>
    );
  }

  const payload = lines
    .filter((line) => line.name.trim().length > 0)
    .map((line) => ({ kind: 'CUSTOM' as const, name: line.name.trim(), quantity: line.quantity }));

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="items" value={JSON.stringify(payload)} readOnly />

      <fieldset className="space-y-3">
        <legend className="font-display text-lg font-semibold text-foreground">What do you need?</legend>
        <p className="text-sm text-muted">
          An instrument, a spare part, a service plan — describe it however you like. A model number or part number
          gets you a faster answer.
        </p>

        {lines.map((line, index) => (
          <div key={index} className="flex items-end gap-3">
            <FormField label={index === 0 ? 'Item' : `Item ${index + 1}`} htmlFor={`line-${index}`} className="flex-1">
              <Input
                id={`line-${index}`}
                value={line.name}
                placeholder="e.g. Shimadzu LC-2030C deuterium lamp"
                onChange={(event) => updateLine(index, { name: event.target.value })}
              />
            </FormField>
            <FormField label="Qty" htmlFor={`qty-${index}`} className="w-20 flex-none">
              <Input
                id={`qty-${index}`}
                type="number"
                min={1}
                value={line.quantity}
                onChange={(event) => updateLine(index, { quantity: Math.max(1, Number(event.target.value) || 1) })}
              />
            </FormField>
            {lines.length > 1 && (
              <button
                type="button"
                onClick={() => setLines((previous) => previous.filter((_, i) => i !== index))}
                aria-label={`Remove item ${index + 1}`}
                className="mb-1 h-8 w-8 flex-none rounded-lg text-danger hover:bg-danger-bg"
              >
                <Trash2 className="mx-auto h-4 w-4" />
              </button>
            )}
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setLines((previous) => [...previous, { name: '', quantity: 1 }])}
        >
          <Plus className="h-4 w-4" />
          Add another item
        </Button>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-display text-lg font-semibold text-foreground">Where do we send the quote?</legend>

        <FormField label="Your name" htmlFor="contactName" error={state.errors?.contactName} required>
          <Input id="contactName" name="contactName" defaultValue={defaultName} required />
        </FormField>
        <FormField label="Email" htmlFor="contactEmail" error={state.errors?.contactEmail} required>
          <Input id="contactEmail" name="contactEmail" type="email" defaultValue={defaultEmail} required />
        </FormField>
        <FormField label="Phone" htmlFor="contactPhone" error={state.errors?.contactPhone} className="sm:col-span-2">
          <Input id="contactPhone" name="contactPhone" type="tel" defaultValue={defaultPhone} />
        </FormField>
        <FormField
          label="Anything else we should know?"
          htmlFor="notes"
          error={state.errors?.notes}
          className="sm:col-span-2"
          hint="Your lab, the application, timelines, or the instrument the part is for."
        >
          <Textarea id="notes" name="notes" rows={4} />
        </FormField>
      </fieldset>

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}

      <Button type="submit" size="lg" disabled={pending || payload.length === 0}>
        {pending ? 'Sending…' : 'Send quote request'}
      </Button>
    </form>
  );
}
