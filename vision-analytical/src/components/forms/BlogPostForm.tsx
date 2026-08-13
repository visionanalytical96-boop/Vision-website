'use client';

import { useActionState } from 'react';
import { createBlogPost, updateBlogPost, type BlogPostFormState } from '@/lib/actions/admin-blog';
import { ARTICLE_KINDS, ARTICLE_KIND_LABELS } from '@/lib/article-kinds';
import { ArticleKind } from '@/generated/prisma/enums';
import {
  ArticleLinkEditor,
  type ArticleLinkValue,
  type LinkOption,
  type ModelOption,
} from './ArticleLinkEditor';
import { CONTENT_STATUSES, CONTENT_STATUS_LABELS } from '@/lib/content-status';
import { ContentStatus } from '@/generated/prisma/enums';
import type { KnowledgeArticle } from '@/generated/prisma/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { ImageInput } from '@/components/ui/ImageInput';
import { submittedOr } from '@/lib/form-values';

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

export function BlogPostForm({
  post,
  brands,
  models,
  products,
  topics,
  reviewers = [],
  tags = '',
  links = [],
}: {
  post?: KnowledgeArticle;
  brands: LinkOption[];
  models: ModelOption[];
  products: LinkOption[];
  topics: Array<{ id: string; name: string }>;
  reviewers?: Array<{ id: string; name: string }>;
  /** Comma-separated, as the field is edited. */
  tags?: string;
  links?: ArticleLinkValue[];
}) {
  const action = post ? updateBlogPost.bind(null, post.id) : createBlogPost;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid max-w-3xl gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <ImageInput name="image" label="Cover image" defaultImageUrl={post?.coverImage} error={state.errors?.image} hint="JPEG, PNG or WebP, up to 8MB" />
      </div>

      <FormField label="Title" htmlFor="title" error={state.errors?.title} required className="sm:col-span-2">
        <Input id="title" name="title" defaultValue={submittedOr(state.values, 'title', post?.title)} required />
      </FormField>

      <FormField label="Slug" htmlFor="slug" error={state.errors?.slug} hint="lowercase-with-hyphens" required>
        <Input id="slug" name="slug" defaultValue={submittedOr(state.values, 'slug', post?.slug)} required />
      </FormField>

      <FormField label="Type" htmlFor="kind" error={state.errors?.kind} required>
        <Select id="kind" name="kind" defaultValue={submittedOr(state.values, 'kind', post?.kind ?? ArticleKind.ARTICLE)} required>
          {ARTICLE_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {ARTICLE_KIND_LABELS[kind]}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Topic"
        htmlFor="topicId"
        error={state.errors?.topicId}
        hint="What it is about — the technique or subject area."
      >
        <Select id="topicId" name="topicId" defaultValue={submittedOr(state.values, 'topicId', post?.topicId ?? '')}>
          <option value="">Not filed under a topic</option>
          {topics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.name}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Tags"
        htmlFor="tags"
        error={state.errors?.tags}
        hint="Comma separated, e.g. baseline, pump, leak."
        className="sm:col-span-2"
      >
        <Input id="tags" name="tags" defaultValue={submittedOr(state.values, 'tags', tags)} placeholder="baseline, pump" />
      </FormField>

      <FormField
        label="Reviewed by"
        htmlFor="reviewerId"
        error={state.errors?.reviewerId}
        hint="Who checked the technical content. Recorded on the article."
      >
        <Select id="reviewerId" name="reviewerId" defaultValue={submittedOr(state.values, 'reviewerId', post?.reviewerId ?? '')}>
          <option value="">Not reviewed</option>
          {reviewers.map((reviewer) => (
            <option key={reviewer.id} value={reviewer.id}>
              {reviewer.name}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Excerpt" htmlFor="excerpt" error={state.errors?.excerpt} required className="sm:col-span-2" hint="Short summary shown on the blog index">
        <Textarea id="excerpt" name="excerpt" rows={2} defaultValue={submittedOr(state.values, 'excerpt', post?.excerpt)} required />
      </FormField>

      <FormField
        label="Content"
        htmlFor="content"
        error={state.errors?.content}
        required
        className="sm:col-span-2"
        hint="Markdown supported - headings, lists, bold, tables, etc."
      >
        <Textarea id="content" name="content" rows={16} defaultValue={submittedOr(state.values, 'content', post?.content)} required />
      </FormField>

      <FormField
        label="Error code"
        htmlFor="errorCode"
        error={state.errors?.errorCode}
        hint="For Error code articles. Write it as the instrument shows it, e.g. E-1201."
      >
        <Input id="errorCode" name="errorCode" defaultValue={submittedOr(state.values, 'errorCode', post?.errorCode ?? '')} className="font-mono" />
      </FormField>

      <FormField
        label="Video"
        htmlFor="videoUrl"
        error={state.errors?.videoUrl}
        hint="A YouTube or Vimeo link. Watch or share links are converted automatically."
      >
        <Input id="videoUrl" name="videoUrl" defaultValue={submittedOr(state.values, 'videoUrl', post?.videoUrl ?? '')} />
      </FormField>

      <div className="sm:col-span-2">
        <ArticleLinkEditor name="linksJson" brands={brands} models={models} products={products} initialRows={links} />
      </div>

      <FormField label="SEO title" htmlFor="seoTitle" error={state.errors?.seoTitle}>
        <Input id="seoTitle" name="seoTitle" defaultValue={submittedOr(state.values, 'seoTitle', post?.seoTitle ?? '')} />
      </FormField>
      <FormField label="SEO description" htmlFor="seoDescription" error={state.errors?.seoDescription}>
        <Input id="seoDescription" name="seoDescription" defaultValue={submittedOr(state.values, 'seoDescription', post?.seoDescription ?? '')} />
      </FormField>

      <FormField label="Status" htmlFor="status" error={state.errors?.status} required>
        <Select id="status" name="status" defaultValue={submittedOr(state.values, 'status', post?.status ?? ContentStatus.DRAFT)} required>
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
        <Input id="reviewNote" name="reviewNote" defaultValue={submittedOr(state.values, 'reviewNote', post?.reviewNote ?? '')} />
      </FormField>

      {state.formError && <p className="text-sm text-danger sm:col-span-2">{state.formError}</p>}

      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? 'Saving…' : post ? 'Save Changes' : 'Create Post'}
      </Button>
    </form>
  );
}
