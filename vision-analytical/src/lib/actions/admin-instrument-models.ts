'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { formValues } from '@/lib/form-values';
import { requireRole } from '@/lib/dal';
import { instrumentModelFormSchema } from '@/lib/validation/admin-products';
import { Role } from '@/generated/prisma/client';

export interface InstrumentModelFormState {
  errors?: Record<string, string[] | undefined>;
  formError?: string;
  /** Echoed back so a validation error doesn't wipe the form - see formValues. */
  values?: Record<string, string>;
}

function parseForm(formData: FormData) {
  return instrumentModelFormSchema.safeParse({
    brandId: formData.get('brandId'),
    name: formData.get('name'),
    slug: formData.get('slug'),
    categoryId: String(formData.get('categoryId') ?? ''),
    description: String(formData.get('description') ?? ''),
    isPublished: formData.get('isPublished') === 'true',
    sortOrder: String(formData.get('sortOrder') ?? ''),
  });
}

function revalidateModels() {
  revalidatePath('/admin/products/instrument-models');
  revalidatePath('/spare-parts');
}

export async function createInstrumentModel(
  _prevState: InstrumentModelFormState | undefined,
  formData: FormData,
): Promise<InstrumentModelFormState> {
  await requireRole(Role.ADMIN);

  const validated = parseForm(formData);
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, values: formValues(formData) };
  }
  const data = validated.data;

  const clash = await prisma.instrumentModel.findUnique({
    where: { brandId_slug: { brandId: data.brandId, slug: data.slug } },
  });
  if (clash) {
    return { errors: { slug: ['This brand already has a model with that slug.'] }, values: formValues(formData) };
  }

  await prisma.instrumentModel.create({
    data: {
      brandId: data.brandId,
      name: data.name,
      slug: data.slug,
      categoryId: data.categoryId || null,
      description: data.description || null,
      isPublished: data.isPublished,
      sortOrder: data.sortOrder,
    },
  });

  revalidateModels();
  redirect('/admin/products/instrument-models');
}

export async function updateInstrumentModel(
  id: string,
  _prevState: InstrumentModelFormState | undefined,
  formData: FormData,
): Promise<InstrumentModelFormState> {
  await requireRole(Role.ADMIN);

  const validated = parseForm(formData);
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, values: formValues(formData) };
  }
  const data = validated.data;

  const clash = await prisma.instrumentModel.findUnique({
    where: { brandId_slug: { brandId: data.brandId, slug: data.slug } },
  });
  if (clash && clash.id !== id) {
    return { errors: { slug: ['This brand already has a model with that slug.'] }, values: formValues(formData) };
  }

  await prisma.instrumentModel.update({
    where: { id },
    data: {
      brandId: data.brandId,
      name: data.name,
      slug: data.slug,
      categoryId: data.categoryId || null,
      description: data.description || null,
      isPublished: data.isPublished,
      sortOrder: data.sortOrder,
    },
  });

  revalidateModels();
  redirect('/admin/products/instrument-models');
}

export async function deleteInstrumentModel(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  // Compatibility rows cascade: a claim against a model that no longer exists
  // would be a claim about nothing.
  await prisma.instrumentModel.delete({ where: { id: String(formData.get('id')) } });
  revalidateModels();
}

export async function toggleInstrumentModelPublished(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  const id = String(formData.get('id'));
  const model = await prisma.instrumentModel.findUnique({ where: { id }, select: { isPublished: true } });
  if (!model) return;
  await prisma.instrumentModel.update({ where: { id }, data: { isPublished: !model.isPublished } });
  revalidateModels();
}
