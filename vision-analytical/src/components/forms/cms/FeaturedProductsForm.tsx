'use client';

import { useActionState, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { updateHomeSection, type CmsFormState } from '@/lib/actions/admin-cms';
import { HomeSectionKey } from '@/generated/prisma/enums';
import type { FeaturedProductsContent } from '@/lib/cms/schemas';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';

const initialState: CmsFormState = {};
const boundAction = updateHomeSection.bind(null, HomeSectionKey.FEATURED_PRODUCTS);

export interface SelectableProduct {
  slug: string;
  name: string;
  sku: string;
}

export function FeaturedProductsForm({
  content,
  products,
}: {
  content: FeaturedProductsContent;
  products: SelectableProduct[];
}) {
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [form, setForm] = useState(content);

  function setSlug(index: number, slug: string) {
    setForm((prev) => ({ ...prev, productSlugs: prev.productSlugs.map((value, i) => (i === index ? slug : value)) }));
  }

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <input type="hidden" name="contentJson" value={JSON.stringify(form)} readOnly />

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

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">Featured items</legend>
        <p className="text-sm text-muted">
          Pick up to four products in the order they should appear. Leave the list empty to show the four most recently
          added products automatically.
        </p>
        {form.productSlugs.map((slug, index) => (
          <div key={index} className="flex items-end gap-3">
            <FormField label={`Position ${index + 1}`} htmlFor={`featured-${index}`} className="flex-1">
              <Select id={`featured-${index}`} value={slug} onChange={(event) => setSlug(index, event.target.value)}>
                <option value="">Select a product…</option>
                {products.map((product) => (
                  <option key={product.slug} value={product.slug}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </Select>
            </FormField>
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({ ...prev, productSlugs: prev.productSlugs.filter((_, i) => i !== index) }))
              }
              aria-label={`Remove position ${index + 1}`}
              className="mb-1 h-8 w-8 shrink-0 rounded-lg text-danger hover:bg-danger-bg"
            >
              <Trash2 className="mx-auto h-4 w-4" />
            </button>
          </div>
        ))}
        {form.productSlugs.length < 4 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setForm((prev) => ({ ...prev, productSlugs: [...prev.productSlugs, ''] }))}
          >
            <Plus className="h-4 w-4" />
            Add product
          </Button>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Link label" htmlFor="viewAllLabel">
          <Input
            id="viewAllLabel"
            value={form.viewAllLabel}
            onChange={(event) => setForm((prev) => ({ ...prev, viewAllLabel: event.target.value }))}
          />
        </FormField>
        <FormField label="Link URL" htmlFor="viewAllHref">
          <Input
            id="viewAllHref"
            value={form.viewAllHref}
            onChange={(event) => setForm((prev) => ({ ...prev, viewAllHref: event.target.value }))}
          />
        </FormField>
      </div>

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}
      {state.success && <p className="text-sm text-success">Saved.</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save Featured Products'}
        </Button>
      </div>
    </form>
  );
}
