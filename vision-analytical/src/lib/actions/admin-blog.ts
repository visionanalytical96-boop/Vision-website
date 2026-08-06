'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/dal';
import { blogPostFormSchema } from '@/lib/validation/admin-blog';
import { Role } from '@/generated/prisma/client';

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
    isPublished: formData.get('isPublished') === 'true',
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

  await prisma.blogPost.create({
    data: {
      slug: data.slug,
      title: data.title,
      category: data.category,
      excerpt: data.excerpt,
      content: data.content,
      isPublished: data.isPublished,
      publishedAt: data.isPublished ? new Date() : null,
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

  await prisma.blogPost.update({
    where: { id },
    data: {
      slug: data.slug,
      title: data.title,
      category: data.category,
      excerpt: data.excerpt,
      content: data.content,
      isPublished: data.isPublished,
      publishedAt: data.isPublished ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
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

export async function toggleBlogPostPublished(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const post = await prisma.blogPost.findUnique({ where: { id }, select: { isPublished: true, publishedAt: true, slug: true } });
  if (!post) return;

  const nextIsPublished = !post.isPublished;
  await prisma.blogPost.update({
    where: { id },
    data: {
      isPublished: nextIsPublished,
      publishedAt: nextIsPublished ? (post.publishedAt ?? new Date()) : post.publishedAt,
    },
  });

  revalidatePath('/admin/blog');
  revalidatePath('/blog');
  revalidatePath(`/blog/${post.slug}`);
}
