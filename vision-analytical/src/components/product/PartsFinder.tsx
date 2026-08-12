'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';

export interface FinderBrand {
  slug: string;
  name: string;
  models: { slug: string; name: string }[];
}

/**
 * "Which parts fit my instrument?" - the question most spare-parts visitors
 * actually arrive with. Narrows the store to parts claiming that model plus
 * the brand-wide fittings, which is what `?brand=&model=` resolves to.
 */
export function PartsFinder({ brands, initialBrand, initialModel }: {
  brands: FinderBrand[];
  initialBrand?: string;
  initialModel?: string;
}) {
  const router = useRouter();
  const [brandSlug, setBrandSlug] = useState(initialBrand ?? '');
  const [modelSlug, setModelSlug] = useState(initialModel ?? '');

  const models = brands.find((brand) => brand.slug === brandSlug)?.models ?? [];

  function submit() {
    if (!brandSlug) return;
    const params = new URLSearchParams({ brand: brandSlug });
    if (modelSlug) params.set('model', modelSlug);
    router.push(`/spare-parts?${params.toString()}`);
  }

  return (
    <div className="rounded-xl border border-border bg-surface-muted p-5">
      <div className="flex items-center gap-2">
        <Wrench className="h-4 w-4 text-primary dark:text-secondary" aria-hidden />
        <p className="font-display font-semibold text-foreground">Find parts for my instrument</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <FormField label="Brand" htmlFor="finder-brand">
          <Select
            id="finder-brand"
            value={brandSlug}
            onChange={(event) => {
              setBrandSlug(event.target.value);
              // The old model belongs to the old brand; keeping it would send
              // the visitor to a combination that matches nothing.
              setModelSlug('');
            }}
          >
            <option value="">Select a brand…</option>
            {brands.map((brand) => (
              <option key={brand.slug} value={brand.slug}>
                {brand.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Model" htmlFor="finder-model" hint={brandSlug ? undefined : 'Pick a brand first.'}>
          <Select
            id="finder-model"
            value={modelSlug}
            disabled={models.length === 0}
            onChange={(event) => setModelSlug(event.target.value)}
          >
            <option value="">All {brandSlug ? 'models' : 'models'}</option>
            {models.map((model) => (
              <option key={model.slug} value={model.slug}>
                {model.name}
              </option>
            ))}
          </Select>
        </FormField>

        <Button type="button" onClick={submit} disabled={!brandSlug} className="sm:mb-0">
          Show parts
        </Button>
      </div>
    </div>
  );
}
