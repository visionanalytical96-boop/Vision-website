'use client';

import { useActionState, useState } from 'react';
import { updatePageContent, type CmsFormState } from '@/lib/actions/admin-cms';
import { ContentPageKey } from '@/generated/prisma/enums';
import type { AnnouncementContent } from '@/lib/cms/schemas';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';

const initialState: CmsFormState = {};
const boundAction = updatePageContent.bind(null, ContentPageKey.ANNOUNCEMENT);

export function AnnouncementBarForm({ content }: { content: AnnouncementContent }) {
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [form, setForm] = useState(content);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      <input type="hidden" name="contentJson" value={JSON.stringify(form)} readOnly />

      <label className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
        <input
          type="checkbox"
          checked={form.isEnabled}
          onChange={(event) => setForm((prev) => ({ ...prev, isEnabled: event.target.checked }))}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        <span className="text-sm font-medium text-foreground">Show the announcement bar on every public page</span>
      </label>

      <FormField label="Message" htmlFor="message">
        <Input
          id="message"
          value={form.message}
          onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Link label" htmlFor="linkLabel" hint="Leave blank for a message with no link.">
          <Input
            id="linkLabel"
            value={form.linkLabel}
            onChange={(event) => setForm((prev) => ({ ...prev, linkLabel: event.target.value }))}
          />
        </FormField>
        <FormField label="Link URL" htmlFor="linkHref">
          <Input
            id="linkHref"
            value={form.linkHref}
            onChange={(event) => setForm((prev) => ({ ...prev, linkHref: event.target.value }))}
          />
        </FormField>
      </div>

      <p className="text-sm text-muted">
        Visitors can dismiss the bar. Changing the message brings it back for everyone who dismissed the previous one.
      </p>

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}
      {state.success && <p className="text-sm text-success">Saved.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save Announcement Bar'}
      </Button>
    </form>
  );
}
