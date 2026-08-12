'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/dal';
import { blogPostFormSchema } from '@/lib/validation/admin-blog';
import { saveUploadedImage } from '@/lib/upload-image';
import { Role, ContentStatus } from '@/generated/prisma/client';
import { isContentStatus } from '@/lib/content-status';

export interface BlogPostFormState {
  errors?: Record<string, string[] | undefined>;
  formError?: string;
}

function parseBlogPostForm(formData: FormData) {
  return blogPostFormSchema.safeParse({
    slug: formData.get('slug'),
    title: formData.get('title'),
    category: formData.get('category'),
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
    return { errors: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;
  const existingSlug = await prisma.blogPost.findUnique({ where: { slug: data.slug } });
  if (existingSlug) {
    return { errors: { slug: ['A post with this slug already exists.'] } };
  }

  const imageFile = formData.get('image');
  const upload = await saveUploadedImage(imageFile instanceof File ? imageFile : null, 'blog');
  if (upload.error) {
    return { errors: { image: [upload.error] } };
  }

  await prisma.blogPost.create({
    data: {
      slug: data.slug,
      title: data.title,
      category: data.category,
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

  revalidatePath('/admin/blog');
  revalidatePath('/blog');
  redirect('/admin/blog');
}

export async function updateBlogPost(id: string, _prevState: BlogPostFormState | undefined, formData: FormData): Promise<BlogPostFormState> {
  await requireRole(Role.ADMIN);

  const validated = parseBlogPostForm(formData);
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) {
    return { formError: 'Post not found.' };
  }

  const slugOwner = await prisma.blogPost.findUnique({ where: { slug: data.slug } });
  if (slugOwner && slugOwner.id !== id) {
    return { errors: { slug: ['A post with this slug already exists.'] } };
  }

  const imageFile = formData.get('image');
  const upload = await saveUploadedImage(imageFile instanceof File ? imageFile : null, 'blog');
  if (upload.error) {
    return { errors: { image: [upload.error] } };
  }

  await prisma.blogPost.update({
    where: { id },
    data: {
      slug: data.slug,
      title: data.title,
      category: data.category,
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

  const post = await prisma.blogPost.delete({ where: { id } }).catch(() => null);
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

  const post = await prisma.blogPost.findUnique({
    where: { id },
    select: { publishedAt: true, publishAt: true, slug: true },
  });
  if (!post) return;

  await prisma.blogPost.update({
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
