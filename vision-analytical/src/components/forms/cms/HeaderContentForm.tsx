'use client';

import { useActionState, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { updatePageContent, type CmsFormState } from '@/lib/actions/admin-cms';
import { ContentPageKey } from '@/generated/prisma/enums';
import type { HeaderContent } from '@/lib/cms/schemas';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';

const initialState: CmsFormState = {};
const boundAction = updatePageContent.bind(null, ContentPageKey.HEADER);

export function HeaderContentForm({ content }: { content: HeaderContent }) {
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [form, setForm] = useState(content);

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <input type="hidden" name="contentJson" value={JSON.stringify(form)} readOnly />
      <p className="text-sm text-muted">
        These links appear in the main site navigation and are reused as the &ldquo;Company&rdquo; column in the footer.
      </p>

      <div className="space-y-3">
        {form.navLinks.map((link, index) => (
          <div key={index} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <FormField label="Label" htmlFor={`nav-label-${index}`}>
                <Input
                  id={`nav-label-${index}`}
                  value={link.label}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      navLinks: prev.navLinks.map((l, i) => (i === index ? { ...l, label: event.target.value } : l)),
                    }))
                  }
                />
              </FormField>
              <FormField label="Link" htmlFor={`nav-href-${index}`}>
                <Input
                  id={`nav-href-${index}`}
                  value={link.href}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      navLinks: prev.navLinks.map((l, i) => (i === index ? { ...l, href: event.target.value } : l)),
                    }))
                  }
                />
              </FormField>
            </div>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, navLinks: prev.navLinks.filter((_, i) => i !== index) }))}
              aria-label="Remove link"
              className="mt-1 h-8 w-8 shrink-0 rounded-lg text-danger hover:bg-danger-bg"
            >
              <Trash2 className="mx-auto h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setForm((prev) => ({ ...prev, navLinks: [...prev.navLinks, { label: '', href: '' }] }))}
      >
        <Plus className="h-4 w-4" />
        Add link
      </Button>

      {state.formError && <p className="text-sm text-danger">{state.formError}</p>}
      {state.success && <p className="text-sm text-success">Saved.</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save Navigation'}
        </Button>
      </div>
    </form>
  );
}
