'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/dal';
import { categoryFormSchema } from '@/lib/validation/admin-categories';
import { Role } from '@/generated/prisma/client';

export interface CategoryFormState {
  errors?: Record<string, string[] | undefined>;
  formError?: string;
}

export async function createCategory(_prevState: CategoryFormState | undefined, formData: FormData): Promise<CategoryFormState> {
  await requireRole(Role.ADMIN);

  const validated = categoryFormSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    kind: formData.get('kind'),
    description: String(formData.get('description') ?? ''),
    sortOrder: String(formData.get('sortOrder') ?? '0'),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { name, slug, kind, description, sortOrder } = validated.data;

  const existing = await prisma.category.findUnique({ where: { slug_kind: { slug, kind } } });
  if (existing) {
    return { formError: `A ${kind.toLowerCase()} category with slug "${slug}" already exists.` };
  }

  await prisma.category.create({
    data: { name, slug, kind, description: description || null, sortOrder },
  });

  revalidatePath('/admin/products/categories');
  return {};
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  await prisma.category.delete({ where: { id } }).catch(() => {
    // Category still referenced by products/instruments - leave it in place.
  });
  revalidatePath('/admin/products/categories');
}
