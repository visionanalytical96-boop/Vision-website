'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { formValues } from '@/lib/form-values';
import { requireRole } from '@/lib/dal';
import { blogPostFormSchema, articleLinkListSchema } from '@/lib/validation/admin-blog';
import { saveUploadedImage } from '@/lib/upload-image';
import { Role, ContentStatus } from '@/generated/prisma/client';
import { isContentStatus } from '@/lib/content-status';
import { slugify } from '@/lib/slug';

/**
 * Tags as typed, one line of comma-separated names.
 *
 * Upserted by slug so "HPLC" and "hplc" land on the same tag rather than
 * quietly creating two that mean the same thing.
 */
async function writeArticleTags(articleId: string, raw: string): Promise<void> {
  const names = [...new Set(raw.split(',').map((name) => name.trim()).filter(Boolean))].slice(0, 25);

  const tagIds: string[] = [];
  for (const name of names) {
    const tag = await prisma.tag.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name) },
    });
    tagIds.push(tag.id);
  }

  await prisma.$transaction([
    prisma.knowledgeArticleTag.deleteMany({ where: { articleId } }),
    ...(tagIds.length > 0
      ? [prisma.knowledgeArticleTag.createMany({ data: tagIds.map((tagId) => ({ articleId, tagId })) })]
      : []),
  ]);
}

/**
 * Snapshots an article before it is overwritten.
 *
 * Taken before the update rather than after, so the stored revision is the
 * version that existed - not the one replacing it.
 */
async function snapshotRevision(articleId: string, editorId: string, editorLabel: string, changeNote?: string) {
  const current = await prisma.knowledgeArticle.findUnique({ where: { id: articleId } });
  if (!current) return;

  await prisma.articleRevision.upsert({
    where: { articleId_version: { articleId, version: current.version } },
    update: {},
    create: {
      articleId,
      version: current.version,
      title: current.title,
      excerpt: current.excerpt,
      content: current.content,
      status: current.status,
      editedById: editorId,
      editorLabel,
      changeNote: changeNote || null,
    },
  });
}

/**
 * "What this article is about" - replace-in-place, like the product editor's
 * repeaters: the form always posts the full intended set.
 */
async function writeArticleLinks(articleId: string, formData: FormData): Promise<string | null> {
  let parsed;
  try {
    parsed = articleLinkListSchema.safeParse(JSON.parse(String(formData.get('linksJson') ?? '[]')));
  } catch {
    return 'Something went wrong reading the form. Please refresh and try again.';
  }
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => issue.message).join(', ');
  }

  // A row with no target is the editor's blank placeholder, not data - and the
  // database rejects it outright.
  const rows = parsed.data.filter((row) => row.brandId || row.instrumentModelId || row.productId);

  await prisma.$transaction([
    prisma.knowledgeArticleLink.deleteMany({ where: { articleId } }),
    ...(rows.length > 0
      ? [
          prisma.knowledgeArticleLink.createMany({
            data: rows.map((row) => ({
              articleId,
              brandId: row.brandId || null,
              instrumentModelId: row.instrumentModelId || null,
              productId: row.productId || null,
            })),
          }),
        ]
      : []),
  ]);

  return null;
}

export interface BlogPostFormState {
  errors?: Record<string, string[] | undefined>;
  formError?: string;
  /** Echoed back so a validation error doesn't wipe the form - see formValues. */
  values?: Record<string, string>;
}

function parseBlogPostForm(formData: FormData) {
  return blogPostFormSchema.safeParse({
    slug: formData.get('slug'),
    title: formData.get('title'),
    topicId: String(formData.get('topicId') ?? ''),
    tags: String(formData.get('tags') ?? ''),
    reviewerId: String(formData.get('reviewerId') ?? ''),
    kind: formData.get('kind'),
    errorCode: String(formData.get('errorCode') ?? ''),
    videoUrl: String(formData.get('videoUrl') ?? ''),
    excerpt: formData.get('excerpt'),
    content: formData.get('content'),
    status: formData.get('status'),
    publishAt: String(formData.get('publishAt') ?? ''),
    reviewNote: String(formData.get('reviewNote') ?? ''),
    seoTitle: String(formData.get('seoTitle') ?? ''),
    seoDescription: String(formData.get('seoDescription') ?? ''),
  });
}

export async function createBlogPost(_prevState: BlogPostFormState | undefined, formData: FormData): Promise<BlogPostFormState> {
  const session = await requireRole(Role.ADMIN);

  const validated = parseBlogPostForm(formData);
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, values: formValues(formData) };
  }

  const data = validated.data;
  const existingSlug = await prisma.knowledgeArticle.findUnique({ where: { slug: data.slug } });
  if (existingSlug) {
    return { errors: { slug: ['A post with this slug already exists.'] }, values: formValues(formData) };
  }

  const imageFile = formData.get('image');
  const upload = await saveUploadedImage(imageFile instanceof File ? imageFile : null, 'blog');
  if (upload.error) {
    return { errors: { image: [upload.error] }, values: formValues(formData) };
  }

  const created = await prisma.knowledgeArticle.create({
    data: {
      slug: data.slug,
      title: data.title,
      topicId: data.topicId || null,
      reviewerId: data.reviewerId || null,
      kind: data.kind,
      errorCode: data.errorCode || null,
      videoUrl: data.videoUrl,
      excerpt: data.excerpt,
      content: data.content,
      coverImage: upload.url,
      status: data.status,
      publishAt: data.publishAt,
      // publishedAt records when it first went live, for display and ordering;
      // publishAt is the scheduling gate. They are not the same thing.
      publishedAt: data.status === ContentStatus.PUBLISHED ? (data.publishAt ?? new Date()) : null,
      reviewNote: data.reviewNote || null,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      authorId: session.userId,
    },
  });

  const linkError = await writeArticleLinks(created.id, formData);
  if (linkError) return { formError: linkError, values: formValues(formData) };
  await writeArticleTags(created.id, String(formData.get('tags') ?? ''));

  revalidatePath('/admin/blog');
  revalidatePath('/blog');
  redirect('/admin/blog');
}

export async function updateBlogPost(id: string, _prevState: BlogPostFormState | undefined, formData: FormData): Promise<BlogPostFormState> {
  const session = await requireRole(Role.ADMIN);

  const validated = parseBlogPostForm(formData);
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, values: formValues(formData) };
  }

  const data = validated.data;
  const existing = await prisma.knowledgeArticle.findUnique({ where: { id } });
  if (!existing) {
    return { formError: 'Post not found.', values: formValues(formData) };
  }

  const slugOwner = await prisma.knowledgeArticle.findUnique({ where: { slug: data.slug } });
  if (slugOwner && slugOwner.id !== id) {
    return { errors: { slug: ['A post with this slug already exists.'] }, values: formValues(formData) };
  }

  const imageFile = formData.get('image');
  const upload = await saveUploadedImage(imageFile instanceof File ? imageFile : null, 'blog');
  if (upload.error) {
    return { errors: { image: [upload.error] }, values: formValues(formData) };
  }

  // Snapshot before overwriting, so the stored revision is the version that
  // existed rather than the one replacing it.
  const editor = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true } });
  await snapshotRevision(
    id,
    session.userId,
    editor ? `${editor.name} (${editor.email})` : 'Unknown',
    String(formData.get('reviewNote') ?? ''),
  );

  // Content edits bump the version; a status-only change does not, so the
  // history counts real revisions rather than button presses.
  const contentChanged =
    existing.title !== data.title || existing.excerpt !== data.excerpt || existing.content !== data.content;

  await prisma.knowledgeArticle.update({
    where: { id },
    data: {
      version: contentChanged ? existing.version + 1 : existing.version,
      slug: data.slug,
      title: data.title,
      topicId: data.topicId || null,
      reviewerId: data.reviewerId || null,
      kind: data.kind,
      errorCode: data.errorCode || null,
      videoUrl: data.videoUrl,
      excerpt: data.excerpt,
      content: data.content,
      coverImage: upload.url ?? existing.coverImage,
      status: data.status,
      publishAt: data.publishAt,
      publishedAt:
        data.status === ContentStatus.PUBLISHED
          ? (existing.publishedAt ?? data.publishAt ?? new Date())
          : existing.publishedAt,
      reviewNote: data.reviewNote || null,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
    },
  });

  const linkError = await writeArticleLinks(id, formData);
  if (linkError) return { formError: linkError, values: formValues(formData) };
  await writeArticleTags(id, String(formData.get('tags') ?? ''));

  revalidatePath('/admin/blog');
  revalidatePath('/blog');
  revalidatePath(`/blog/${data.slug}`);
  if (existing.slug !== data.slug) revalidatePath(`/blog/${existing.slug}`);
  redirect('/admin/blog');
}

export async function deleteBlogPost(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const post = await prisma.knowledgeArticle.delete({ where: { id } }).catch(() => null);
  if (!post) return;

  revalidatePath('/admin/blog');
  revalidatePath('/blog');
  revalidatePath(`/blog/${post.slug}`);
}

/**
 * Moves a post along the workflow. Called from the admin list so the common
 * path (draft -> review -> approved -> published) doesn't need the full editor.
 */
export async function setBlogPostStatus(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  const id = String(formData.get('id') ?? '');
  const rawStatus = String(formData.get('status') ?? '');
  if (!id || !isContentStatus(rawStatus)) return;

  const post = await prisma.knowledgeArticle.findUnique({
    where: { id },
    select: { publishedAt: true, publishAt: true, slug: true },
  });
  if (!post) return;

  await prisma.knowledgeArticle.update({
    where: { id },
    data: {
      status: rawStatus,
      publishedAt:
        rawStatus === ContentStatus.PUBLISHED
          ? (post.publishedAt ?? post.publishAt ?? new Date())
          : post.publishedAt,
    },
  });

  revalidatePath('/admin/blog');
  revalidatePath('/blog');
  revalidatePath(`/blog/${post.slug}`);
}
