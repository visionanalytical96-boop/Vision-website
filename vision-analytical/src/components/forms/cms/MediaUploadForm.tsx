'use client';

import { useActionState, useRef } from 'react';
import { uploadMedia } from '@/lib/actions/media';
import type { CmsFormState } from '@/lib/actions/admin-cms';
import { Button } from '@/components/ui/Button';

const initialState: CmsFormState = {};

export function MediaUploadForm() {
  const [state, formAction, pending] = useActionState(uploadMedia, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="flex flex-wrap items-center gap-3"
    >
      <input
        type="file"
        name="image"
        accept="image/jpeg,image/png,image/webp"
        required
        className="text-sm text-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-surface-muted"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Uploading…' : 'Upload image'}
      </Button>
      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}
      {state.success && <p className="text-sm text-success">Uploaded.</p>}
    </form>
  );
}
