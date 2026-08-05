'use client';

import { useActionState, useEffect } from 'react';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { submitQuoteRequest, type QuoteRequestState } from '@/lib/actions/quotes';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';

const initialState: QuoteRequestState = {};

interface CartReviewFormProps {
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
}

export function CartReviewForm({ defaultName, defaultEmail, defaultPhone }: CartReviewFormProps) {
  const { items, updateQuantity, removeItem, clear } = useCart();
  const [state, formAction, pending] = useActionState(submitQuoteRequest, initialState);

  useEffect(() => {
    if (state.quoteNumber) clear();
  }, [state.quoteNumber, clear]);

  if (state.quoteNumber) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="font-display text-2xl font-bold text-foreground">Quote request sent</p>
        <p className="mt-2 text-muted">
          Reference number <span className="font-mono font-medium text-foreground">{state.quoteNumber}</span>. Our
          team will follow up by email or phone with pricing and lead times.
        </p>
        <Link href="/spare-parts" className="mt-6 inline-block text-blue-600 hover:underline dark:text-cyan-400">
          Continue browsing
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <p className="text-muted">Your cart is empty.</p>
        <Link href="/spare-parts" className="mt-4 inline-block text-blue-600 hover:underline dark:text-cyan-400">
          Browse spare parts
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(items.map(({ kind, id, name, quantity }) => ({ kind, id, name, quantity })))}
      />

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
            <div className="flex-1">
              <p className="font-medium text-foreground">{item.name}</p>
              {item.sku && <p className="text-xs text-muted">SKU: {item.sku}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                aria-label="Decrease quantity"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-surface-muted"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-6 text-center text-sm">{item.quantity}</span>
              <button
                type="button"
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                aria-label="Increase quantity"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-surface-muted"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              aria-label="Remove item"
              className="text-muted hover:text-danger"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6">
        <p className="font-display text-lg font-semibold text-foreground">Request a quote</p>

        <FormField label="Name" htmlFor="contactName" error={state.errors?.contactName} required>
          <Input id="contactName" name="contactName" defaultValue={defaultName} required />
        </FormField>
        <FormField label="Email" htmlFor="contactEmail" error={state.errors?.contactEmail} required>
          <Input id="contactEmail" name="contactEmail" type="email" defaultValue={defaultEmail} required />
        </FormField>
        <FormField label="Phone" htmlFor="contactPhone" error={state.errors?.contactPhone}>
          <Input id="contactPhone" name="contactPhone" type="tel" defaultValue={defaultPhone} />
        </FormField>
        <FormField label="Notes" htmlFor="notes" error={state.errors?.notes} hint="Quantities, urgency, PO reference etc.">
          <Textarea id="notes" name="notes" />
        </FormField>

        {state.formError && <p className="text-sm text-danger">{state.formError}</p>}

        <Button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Submit Quote Request'}
        </Button>
      </div>
    </form>
  );
}
