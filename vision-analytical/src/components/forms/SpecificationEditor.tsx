'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';

export interface SpecificationRowValue {
  group: string;
  label: string;
  value: string;
  unit: string;
}

/** Structured specs, so the product page can tabulate rather than run prose. */
export function SpecificationEditor({
  name,
  initialRows,
}: {
  name: string;
  initialRows: SpecificationRowValue[];
}) {
  const [rows, setRows] = useState<SpecificationRowValue[]>(initialRows);

  function update(index: number, patch: Partial<SpecificationRowValue>) {
    setRows((previous) => previous.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-foreground">Specifications</legend>
      <input type="hidden" name={name} value={JSON.stringify(rows)} readOnly />
      <p className="text-sm text-muted">
        Shown as a table on the product page. Use the group to break a long sheet into sections.
      </p>

      {rows.map((row, index) => (
        <div key={index} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
          <div className="grid flex-1 gap-3 sm:grid-cols-4">
            <FormField label="Group" htmlFor={`spec-group-${index}`}>
              <Input
                id={`spec-group-${index}`}
                value={row.group}
                placeholder="e.g. Detector"
                onChange={(event) => update(index, { group: event.target.value })}
              />
            </FormField>
            <FormField label="Label" htmlFor={`spec-label-${index}`}>
              <Input
                id={`spec-label-${index}`}
                value={row.label}
                placeholder="e.g. Wavelength range"
                onChange={(event) => update(index, { label: event.target.value })}
              />
            </FormField>
            <FormField label="Value" htmlFor={`spec-value-${index}`}>
              <Input
                id={`spec-value-${index}`}
                value={row.value}
                placeholder="e.g. 190–800"
                onChange={(event) => update(index, { value: event.target.value })}
              />
            </FormField>
            <FormField label="Unit" htmlFor={`spec-unit-${index}`}>
              <Input
                id={`spec-unit-${index}`}
                value={row.unit}
                placeholder="e.g. nm"
                onChange={(event) => update(index, { unit: event.target.value })}
              />
            </FormField>
          </div>
          <button
            type="button"
            onClick={() => setRows((previous) => previous.filter((_, i) => i !== index))}
            aria-label={`Remove specification ${index + 1}`}
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
        onClick={() => setRows((previous) => [...previous, { group: '', label: '', value: '', unit: '' }])}
      >
        <Plus className="h-4 w-4" />
        Add specification
      </Button>
    </fieldset>
  );
}
