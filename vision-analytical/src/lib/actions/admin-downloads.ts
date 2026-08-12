'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { formValues } from '@/lib/form-values';
import { requireRole } from '@/lib/dal';
import { downloadFormSchema, testimonialFormSchema } from '@/lib/validation/admin-downloads';
import { saveUploadedImage } from '@/lib/upload-image';
import { Role } from '@/generated/prisma/client';

export interface AdminFormState {
  errors?: Record<string, string[] | undefined>;
  formError?: string;
  /** Echoed back so a validation error doesn't wipe the form - see formValues. */
  values?: Record<string, string>;
}

function parseDownloadForm(formData: FormData) {
  return downloadFormSchema.safeParse({
    slug: formData.get('slug'),
    title: formData.get('title'),
    description: String(formData.get('description') ?? ''),
    kind: formData.get('kind'),
    fileUrl: formData.get('fileUrl'),
    fileType: String(formData.get('fileType') ?? ''),
    fileSizeBytes: String(formData.get('fileSizeBytes') ?? ''),
    brandId: String(formData.get('brandId') ?? ''),
    categoryId: String(formData.get('categoryId') ?? ''),
    productId: String(formData.get('productId') ?? ''),
    requiresLogin: formData.get('requiresLogin') === 'true',
    isPublished: formData.get('isPublished') === 'true',
    sortOrder: String(formData.get('sortOrder') ?? ''),
  });
}

function revalidateDownloads() {
  revalidatePath('/admin/website/downloads');
  revalidatePath('/downloads');
}

export async function createDownload(_prevState: AdminFormState | undefined, formData: FormData): Promise<AdminFormState> {
  await requireRole(Role.ADMIN);

  const validated = parseDownloadForm(formData);
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, values: formValues(formData) };
  }
  const data = validated.data;

  if (await prisma.download.findUnique({ where: { slug: data.slug } })) {
    return { errors: { slug: ['A download with this slug already exists.'] }, values: formValues(formData) };
  }

  await prisma.download.create({
    data: {
      slug: data.slug,
      title: data.title,
      description: data.description || null,
      kind: data.kind,
      fileUrl: data.fileUrl,
      fileType: data.fileType || null,
      fileSizeBytes: data.fileSizeBytes,
      brandId: data.brandId || null,
      categoryId: data.categoryId || null,
      productId: data.productId || null,
      requiresLogin: data.requiresLogin,
      isPublished: data.isPublished,
      sortOrder: data.sortOrder,
    },
  });

  revalidateDownloads();
  redirect('/admin/website/downloads');
}

export async function updateDownload(
  id: string,
  _prevState: AdminFormState | undefined,
  formData: FormData,
): Promise<AdminFormState> {
  await requireRole(Role.ADMIN);

  const validated = parseDownloadForm(formData);
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, values: formValues(formData) };
  }
  const data = validated.data;

  const clash = await prisma.download.findUnique({ where: { slug: data.slug } });
  if (clash && clash.id !== id) {
    return { errors: { slug: ['A download with this slug already exists.'] }, values: formValues(formData) };
  }

  await prisma.download.update({
    where: { id },
    data: {
      slug: data.slug,
      title: data.title,
      description: data.description || null,
      kind: data.kind,
      fileUrl: data.fileUrl,
      fileType: data.fileType || null,
      fileSizeBytes: data.fileSizeBytes,
      brandId: data.brandId || null,
      categoryId: data.categoryId || null,
      productId: data.productId || null,
      requiresLogin: data.requiresLogin,
      isPublished: data.isPublished,
      sortOrder: data.sortOrder,
    },
  });

  revalidateDownloads();
  redirect('/admin/website/downloads');
}

export async function deleteDownload(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  await prisma.download.delete({ where: { id: String(formData.get('id')) } });
  revalidateDownloads();
}

export async function toggleDownloadPublished(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  const id = String(formData.get('id'));
  const download = await prisma.download.findUnique({ where: { id }, select: { isPublished: true } });
  if (!download) return;
  await prisma.download.update({ where: { id }, data: { isPublished: !download.isPublished } });
  revalidateDownloads();
}

function parseTestimonialForm(formData: FormData) {
  return testimonialFormSchema.safeParse({
    quote: formData.get('quote'),
    authorName: formData.get('authorName'),
    authorTitle: String(formData.get('authorTitle') ?? ''),
    company: String(formData.get('company') ?? ''),
    isPublished: formData.get('isPublished') === 'true',
    sortOrder: String(formData.get('sortOrder') ?? ''),
  });
}

function revalidateTestimonials() {
  revalidatePath('/admin/website/testimonials');
  revalidatePath('/');
}

export async function createTestimonial(
  _prevState: AdminFormState | undefined,
  formData: FormData,
): Promise<AdminFormState> {
  await requireRole(Role.ADMIN);

  const validated = parseTestimonialForm(formData);
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, values: formValues(formData) };
  }

  const logoFile = formData.get('logo');
  const upload = await saveUploadedImage(logoFile instanceof File ? logoFile : null, 'site');
  if (upload.error) {
    return { errors: { logo: [upload.error] }, values: formValues(formData) };
  }

  const data = validated.data;
  await prisma.testimonial.create({
    data: {
      quote: data.quote,
      authorName: data.authorName,
      authorTitle: data.authorTitle || null,
      company: data.company || null,
      logoUrl: upload.url,
      isPublished: data.isPublished,
      sortOrder: data.sortOrder,
    },
  });

  revalidateTestimonials();
  redirect('/admin/website/testimonials');
}

export async function updateTestimonial(
  id: string,
  _prevState: AdminFormState | undefined,
  formData: FormData,
): Promise<AdminFormState> {
  await requireRole(Role.ADMIN);

  const validated = parseTestimonialForm(formData);
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, values: formValues(formData) };
  }

  const logoFile = formData.get('logo');
  const upload = await saveUploadedImage(logoFile instanceof File ? logoFile : null, 'site');
  if (upload.error) {
    return { errors: { logo: [upload.error] }, values: formValues(formData) };
  }

  const data = validated.data;
  await prisma.testimonial.update({
    where: { id },
    data: {
      quote: data.quote,
      authorName: data.authorName,
      authorTitle: data.authorTitle || null,
      company: data.company || null,
      // Only replace the logo when a new one was actually uploaded.
      ...(upload.url ? { logoUrl: upload.url } : {}),
      isPublished: data.isPublished,
      sortOrder: data.sortOrder,
    },
  });

  revalidateTestimonials();
  redirect('/admin/website/testimonials');
}

export async function deleteTestimonial(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  await prisma.testimonial.delete({ where: { id: String(formData.get('id')) } });
  revalidateTestimonials();
}

export async function toggleTestimonialPublished(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  const id = String(formData.get('id'));
  const testimonial = await prisma.testimonial.findUnique({ where: { id }, select: { isPublished: true } });
  if (!testimonial) return;
  await prisma.testimonial.update({ where: { id }, data: { isPublished: !testimonial.isPublished } });
  revalidateTestimonials();
}
