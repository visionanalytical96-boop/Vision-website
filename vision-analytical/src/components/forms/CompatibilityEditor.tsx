'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';

export interface CompatibilityOptionBrand {
  id: string;
  name: string;
}

export interface CompatibilityOptionModel {
  id: string;
  brandId: string;
  name: string;
}

export interface CompatibilityRowValue {
  brandId: string;
  instrumentModelId: string;
  note: string;
}

/**
 * Compatibility rows for a product. Leaving the model blank claims the part
 * fits that brand generally, which is how universal fittings are sold - the
 * parts finder returns those alongside model-specific matches.
 */
export function CompatibilityEditor({
  name,
  brands,
  models,
  initialRows,
}: {
  name: string;
  brands: CompatibilityOptionBrand[];
  models: CompatibilityOptionModel[];
  initialRows: CompatibilityRowValue[];
}) {
  const [rows, setRows] = useState<CompatibilityRowValue[]>(initialRows);

  function update(index: number, patch: Partial<CompatibilityRowValue>) {
    setRows((previous) => previous.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  // Only complete rows are posted; a freshly added blank row is not data yet.
  const payload = rows.filter((row) => row.brandId !== '');

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-foreground">Compatibility</legend>
      <input type="hidden" name={name} value={JSON.stringify(payload)} readOnly />
      <p className="text-sm text-muted">
        Which instruments this fits. Leave the model blank to say it fits that brand&apos;s systems generally.
      </p>

      {rows.map((row, index) => {
        const brandModels = models.filter((model) => model.brandId === row.brandId);
        return (
          <div key={index} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
            <div className="grid flex-1 gap-3 sm:grid-cols-3">
              <FormField label="Brand" htmlFor={`compat-brand-${index}`}>
                <Select
                  id={`compat-brand-${index}`}
                  value={row.brandId}
                  onChange={(event) => update(index, { brandId: event.target.value, instrumentModelId: '' })}
                >
                  <option value="">Select a brand…</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Model" htmlFor={`compat-model-${index}`}>
                <Select
                  id={`compat-model-${index}`}
                  value={row.instrumentModelId}
                  disabled={brandModels.length === 0}
                  onChange={(event) => update(index, { instrumentModelId: event.target.value })}
                >
                  <option value="">All models of this brand</option>
                  {brandModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Note" htmlFor={`compat-note-${index}`}>
                <Input
                  id={`compat-note-${index}`}
                  value={row.note}
                  placeholder="e.g. requires adapter"
                  onChange={(event) => update(index, { note: event.target.value })}
                />
              </FormField>
            </div>
            <button
              type="button"
              onClick={() => setRows((previous) => previous.filter((_, i) => i !== index))}
              aria-label={`Remove compatibility row ${index + 1}`}
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
        onClick={() => setRows((previous) => [...previous, { brandId: '', instrumentModelId: '', note: '' }])}
      >
        <Plus className="h-4 w-4" />
        Add compatibility
      </Button>
    </fieldset>
  );
}
