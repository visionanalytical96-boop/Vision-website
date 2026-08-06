'use client';

import { useActionState } from 'react';
import { createBlogPost, updateBlogPost, type BlogPostFormState } from '@/lib/actions/admin-blog';
import { BLOG_CATEGORY_LABELS, BLOG_CATEGORIES } from '@/lib/blog-categories';
import type { BlogPost } from '@/generated/prisma/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';

const initialState: BlogPostFormState = {};

export function BlogPostForm({ post }: { post?: BlogPost }) {
  const action = post ? updateBlogPost.bind(null, post.id) : createBlogPost;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid max-w-3xl gap-4 sm:grid-cols-2">
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

      <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
        <input type="checkbox" name="isPublished" value="true" defaultChecked={post?.isPublished ?? false} className="h-4 w-4 rounded border-border" />
        Published (visible on the public site)
      </label>

      {state.formError && <p className="text-sm text-danger sm:col-span-2">{state.formError}</p>}

      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? 'Saving…' : post ? 'Save Changes' : 'Create Post'}
      </Button>
    </form>
  );
}
