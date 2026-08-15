'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';

export interface LinkOption {
  id: string;
  name: string;
}

export interface ModelOption extends LinkOption {
  brandId: string;
}

export interface ArticleLinkValue {
  brandId: string;
  instrumentModelId: string;
  productId: string;
}

/**
 * What an article is about. Each row targets a brand, one of its models, or a
 * product — at least one, since a link to nothing is not a link and the
 * database rejects it.
 */
export function ArticleLinkEditor({
  name,
  brands,
  models,
  products,
  initialRows,
}: {
  name: string;
  brands: LinkOption[];
  models: ModelOption[];
  products: LinkOption[];
  initialRows: ArticleLinkValue[];
}) {
  const [rows, setRows] = useState<ArticleLinkValue[]>(initialRows);

  function update(index: number, patch: Partial<ArticleLinkValue>) {
    setRows((previous) => previous.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  const payload = rows.filter((row) => row.brandId || row.instrumentModelId || row.productId);

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-foreground">This applies to</legend>
      <input type="hidden" name={name} value={JSON.stringify(payload)} readOnly />
      <p className="text-sm text-muted">
        Links this article to the catalogue. It then shows on those product pages and brand hubs, and the error-code
        lookup can say which instruments a code belongs to.
      </p>

      {rows.map((row, index) => {
        const brandModels = models.filter((model) => model.brandId === row.brandId);
        return (
          <div key={index} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
            <div className="grid flex-1 gap-3 sm:grid-cols-3">
              <FormField label="Brand" htmlFor={`link-brand-${index}`}>
                <Select
                  id={`link-brand-${index}`}
                  value={row.brandId}
                  onChange={(event) => update(index, { brandId: event.target.value, instrumentModelId: '' })}
                >
                  <option value="">No brand</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Model" htmlFor={`link-model-${index}`}>
                <Select
                  id={`link-model-${index}`}
                  value={row.instrumentModelId}
                  disabled={brandModels.length === 0}
                  onChange={(event) => update(index, { instrumentModelId: event.target.value })}
                >
                  <option value="">No specific model</option>
                  {brandModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Product" htmlFor={`link-product-${index}`}>
                <Select
                  id={`link-product-${index}`}
                  value={row.productId}
                  onChange={(event) => update(index, { productId: event.target.value })}
                >
                  <option value="">No specific product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <button
              type="button"
              onClick={() => setRows((previous) => previous.filter((_, i) => i !== index))}
              aria-label={`Remove link ${index + 1}`}
              className="mt-1 h-8 w-8 shrink-0 rounded-lg text-danger hover:bg-danger-bg"
            >
              <Trash2 className="mx-auto h-4 w-4" />
            </button>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setRows((previous) => [...previous, { brandId: '', instrumentModelId: '', productId: '' }])}
      >
        <Plus className="h-4 w-4" />
        Add a link
      </Button>
    </fieldset>
  );
}
