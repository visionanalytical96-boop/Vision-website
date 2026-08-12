'use client';

import { useActionState } from 'react';
import { createBlogPost, updateBlogPost, type BlogPostFormState } from '@/lib/actions/admin-blog';
import { BLOG_CATEGORY_LABELS, BLOG_CATEGORIES } from '@/lib/blog-categories';
import { CONTENT_STATUSES, CONTENT_STATUS_LABELS } from '@/lib/content-status';
import { ContentStatus } from '@/generated/prisma/enums';
import type { BlogPost } from '@/generated/prisma/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { ImageInput } from '@/components/ui/ImageInput';

const initialState: BlogPostFormState = {};

/**
 * datetime-local wants "YYYY-MM-DDTHH:mm" in the browser's own zone. Slicing
 * toISOString() would silently shift the value by the UTC offset.
 */
function toLocalInputValue(date: Date | null | undefined): string {
  if (!date) return '';
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function BlogPostForm({ post }: { post?: BlogPost }) {
  const action = post ? updateBlogPost.bind(null, post.id) : createBlogPost;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid max-w-3xl gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <ImageInput name="image" label="Cover image" defaultImageUrl={post?.coverImage} error={state.errors?.image} hint="JPEG, PNG or WebP, up to 8MB" />
      </div>

      <FormField label="Title" htmlFor="title" error={state.errors?.title} required className="sm:col-span-2">
        <Input id="title" name="title" defaultValue={post?.title} required />
      </FormField>

      <FormField label="Slug" htmlFor="slug" error={state.errors?.slug} hint="lowercase-with-hyphens" required>
        <Input id="slug" name="slug" defaultValue={post?.slug} required />
      </FormField>

      <FormField label="Category" htmlFor="category" error={state.errors?.category} required>
        <Select id="category" name="category" defaultValue={post?.category} required>
          {BLOG_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {BLOG_CATEGORY_LABELS[category]}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Excerpt" htmlFor="excerpt" error={state.errors?.excerpt} required className="sm:col-span-2" hint="Short summary shown on the blog index">
        <Textarea id="excerpt" name="excerpt" rows={2} defaultValue={post?.excerpt} required />
      </FormField>

      <FormField
        label="Content"
        htmlFor="content"
        error={state.errors?.content}
        required
        className="sm:col-span-2"
        hint="Markdown supported - headings, lists, bold, tables, etc."
      >
        <Textarea id="content" name="content" rows={16} defaultValue={post?.content} required />
      </FormField>

      <FormField label="SEO title" htmlFor="seoTitle" error={state.errors?.seoTitle}>
        <Input id="seoTitle" name="seoTitle" defaultValue={post?.seoTitle ?? ''} />
      </FormField>
      <FormField label="SEO description" htmlFor="seoDescription" error={state.errors?.seoDescription}>
        <Input id="seoDescription" name="seoDescription" defaultValue={post?.seoDescription ?? ''} />
      </FormField>

      <FormField label="Status" htmlFor="status" error={state.errors?.status} required>
        <Select id="status" name="status" defaultValue={post?.status ?? ContentStatus.DRAFT} required>
          {CONTENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {CONTENT_STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Publish at"
        htmlFor="publishAt"
        error={state.errors?.publishAt}
        hint="Leave blank to go live as soon as the status is Published."
      >
        <Input id="publishAt" name="publishAt" type="datetime-local" defaultValue={toLocalInputValue(post?.publishAt)} />
      </FormField>

      <FormField
        label="Review note"
        htmlFor="reviewNote"
        error={state.errors?.reviewNote}
        className="sm:col-span-2"
        hint="Internal only - what still needs checking before this goes live."
      >
        <Input id="reviewNote" name="reviewNote" defaultValue={post?.reviewNote ?? ''} />
      </FormField>

      {state.formError && <p className="text-sm text-danger sm:col-span-2">{state.formError}</p>}

      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? 'Saving…' : post ? 'Save Changes' : 'Create Post'}
      </Button>
    </form>
  );
}
