'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/dal';
import { refurbishedFormSchema } from '@/lib/validation/admin-refurbished';
import { saveUploadedImage } from '@/lib/upload-image';
import { Role } from '@/generated/prisma/client';

export interface RefurbishedFormState {
  errors?: Record<string, string[] | undefined>;
  formError?: string;
}

function parsePriceMinor(priceRupees: string | undefined): number | null {
  if (!priceRupees) return null;
  const parsed = Number(priceRupees);
  if (Number.isNaN(parsed)) return null;
  return Math.round(parsed * 100);
}

function parseForm(formData: FormData) {
  return refurbishedFormSchema.safeParse({
    slug: formData.get('slug'),
    name: formData.get('name'),
    categoryId: formData.get('categoryId'),
    brand: formData.get('brand'),
    model: String(formData.get('model') ?? ''),
    condition: formData.get('condition'),
    includedAccessories: String(formData.get('includedAccessories') ?? ''),
    warrantyMonths: String(formData.get('warrantyMonths') ?? '0'),
    demoVideoUrl: String(formData.get('demoVideoUrl') ?? ''),
    description: formData.get('description'),
    priceRupees: String(formData.get('priceRupees') ?? ''),
    stockStatus: formData.get('stockStatus'),
    isPublished: formData.get('isPublished') === 'true',
  });
}

export async function createRefurbished(_prevState: RefurbishedFormState | undefined, formData: FormData): Promise<RefurbishedFormState> {
  await requireRole(Role.ADMIN);

  const validated = parseForm(formData);
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;

  const existingSlug = await prisma.refurbishedInstrument.findUnique({ where: { slug: data.slug } });
  if (existingSlug) {
    return { errors: { slug: ['An instrument with this slug already exists.'] } };
  }

  const imageFile = formData.get('image');
  const upload = await saveUploadedImage(imageFile instanceof File ? imageFile : null, 'refurbished');
  if (upload.error) {
    return { errors: { image: [upload.error] } };
  }

  await prisma.refurbishedInstrument.create({
    data: {
      slug: data.slug,
      name: data.name,
      categoryId: data.categoryId,
      brand: data.brand,
      model: data.model || null,
      condition: data.condition,
      includedAccessories: data.includedAccessories
        ? data.includedAccessories.split(',').map((a) => a.trim()).filter(Boolean)
        : [],
      warrantyMonths: data.warrantyMonths,
      demoVideoUrl: data.demoVideoUrl || null,
      description: data.description,
      images: upload.url ? [upload.url] : [],
      priceMinor: parsePriceMinor(data.priceRupees),
      stockStatus: data.stockStatus,
      isPublished: data.isPublished,
    },
  });

  revalidatePath('/admin/products/refurbished');
  redirect('/admin/products/refurbished');
}

export async function updateRefurbished(id: string, _prevState: RefurbishedFormState | undefined, formData: FormData): Promise<RefurbishedFormState> {
  await requireRole(Role.ADMIN);

  const validated = parseForm(formData);
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;

  const slugOwner = await prisma.refurbishedInstrument.findUnique({ where: { slug: data.slug } });
  if (slugOwner && slugOwner.id !== id) {
    return { errors: { slug: ['An instrument with this slug already exists.'] } };
  }

  const imageFile = formData.get('image');
  const upload = await saveUploadedImage(imageFile instanceof File ? imageFile : null, 'refurbished');
  if (upload.error) {
    return { errors: { image: [upload.error] } };
  }

  await prisma.refurbishedInstrument.update({
    where: { id },
    data: {
      slug: data.slug,
      name: data.name,
      categoryId: data.categoryId,
      brand: data.brand,
      model: data.model || null,
      condition: data.condition,
      includedAccessories: data.includedAccessories
        ? data.includedAccessories.split(',').map((a) => a.trim()).filter(Boolean)
        : [],
      warrantyMonths: data.warrantyMonths,
      demoVideoUrl: data.demoVideoUrl || null,
      description: data.description,
      ...(upload.url ? { images: [upload.url] } : {}),
      priceMinor: parsePriceMinor(data.priceRupees),
      stockStatus: data.stockStatus,
      isPublished: data.isPublished,
    },
  });

  revalidatePath('/admin/products/refurbished');
  revalidatePath('/refurbished');
  redirect('/admin/products/refurbished');
}

export async function deleteRefurbished(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  await prisma.refurbishedInstrument.delete({ where: { id } });
  revalidatePath('/admin/products/refurbished');
}
