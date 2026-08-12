'use client';

import { useActionState } from 'react';
import { createDownload, updateDownload, type AdminFormState } from '@/lib/actions/admin-downloads';
import { DOWNLOAD_KINDS, DOWNLOAD_KIND_LABELS } from '@/lib/downloads';
import type { Download } from '@/generated/prisma/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';

const initialState: AdminFormState = {};

export interface DownloadFormOption {
  id: string;
  name: string;
}

export function DownloadForm({
  download,
  brands,
  categories,
}: {
  download?: Download;
  brands: DownloadFormOption[];
  categories: DownloadFormOption[];
}) {
  const action = download ? updateDownload.bind(null, download.id) : createDownload;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid max-w-3xl gap-4 sm:grid-cols-2">
      <FormField label="Title" htmlFor="title" error={state.errors?.title} required className="sm:col-span-2">
        <Input id="title" name="title" defaultValue={download?.title} required />
      </FormField>

      <FormField label="Slug" htmlFor="slug" error={state.errors?.slug} hint="lowercase-with-hyphens" required>
        <Input id="slug" name="slug" defaultValue={download?.slug} required />
      </FormField>

      <FormField label="Document type" htmlFor="kind" error={state.errors?.kind} required>
        <Select id="kind" name="kind" defaultValue={download?.kind} required>
          {DOWNLOAD_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {DOWNLOAD_KIND_LABELS[kind]}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Description" htmlFor="description" error={state.errors?.description} className="sm:col-span-2">
        <Textarea id="description" name="description" rows={2} defaultValue={download?.description ?? ''} />
      </FormField>

      <FormField
        label="File URL"
        htmlFor="fileUrl"
        error={state.errors?.fileUrl}
        required
        className="sm:col-span-2"
        hint="Upload the file in the Media Library and paste its path (/uploads/…), or link the manufacturer's copy."
      >
        <Input id="fileUrl" name="fileUrl" defaultValue={download?.fileUrl} required />
      </FormField>

      <FormField label="File type" htmlFor="fileType" error={state.errors?.fileType} hint="e.g. PDF">
        <Input id="fileType" name="fileType" defaultValue={download?.fileType ?? ''} />
      </FormField>

      <FormField label="File size" htmlFor="fileSizeBytes" error={state.errors?.fileSizeBytes} hint="In bytes. Optional.">
        <Input
          id="fileSizeBytes"
          name="fileSizeBytes"
          type="number"
          min={0}
          defaultValue={download?.fileSizeBytes ?? ''}
        />
      </FormField>

      <FormField label="Brand" htmlFor="brandId" error={state.errors?.brandId}>
        <Select id="brandId" name="brandId" defaultValue={download?.brandId ?? ''}>
          <option value="">No specific brand</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Category" htmlFor="categoryId" error={state.errors?.categoryId}>
        <Select id="categoryId" name="categoryId" defaultValue={download?.categoryId ?? ''}>
          <option value="">No specific category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Sort order" htmlFor="sortOrder" error={state.errors?.sortOrder} hint="Lower numbers appear first.">
        <Input id="sortOrder" name="sortOrder" type="number" defaultValue={download?.sortOrder ?? 0} />
      </FormField>

      <div className="flex flex-col justify-center gap-2 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="requiresLogin"
            value="true"
            defaultChecked={download?.requiresLogin ?? false}
            className="h-4 w-4 rounded border-border"
          />
          Require the visitor to be logged in
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="isPublished"
            value="true"
            defaultChecked={download?.isPublished ?? true}
            className="h-4 w-4 rounded border-border"
          />
          Published (visible on the public site)
        </label>
      </div>

      {state.formError && <p className="text-sm text-danger sm:col-span-2">{state.formError}</p>}

      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? 'Saving…' : download ? 'Save Changes' : 'Add Download'}
      </Button>
    </form>
  );
}
