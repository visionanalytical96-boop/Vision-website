'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { formValues } from '@/lib/form-values';
import { requireRole } from '@/lib/dal';
import {
  productFormSchema,
  compatibilityListSchema,
  specificationListSchema,
} from '@/lib/validation/admin-products';
import { saveUploadedImage } from '@/lib/upload-image';
import { Role } from '@/generated/prisma/client';

export interface ProductFormState {
  errors?: Record<string, string[] | undefined>;
  formError?: string;
  /** Echoed back so a validation error doesn't wipe the form - see formValues. */
  values?: Record<string, string>;
}

function parsePriceMinor(priceRupees: string | undefined): number | null {
  if (!priceRupees) return null;
  const parsed = Number(priceRupees);
  if (Number.isNaN(parsed)) return null;
  return Math.round(parsed * 100);
}

/**
 * Compatibility and specifications arrive as JSON repeaters. A malformed
 * payload means a broken editor, not user error, so it surfaces as a form
 * error rather than being silently dropped.
 */
function parseRepeaters(formData: FormData) {
  let compatibility;
  let specifications;
  try {
    compatibility = compatibilityListSchema.safeParse(JSON.parse(String(formData.get('compatibilityJson') ?? '[]')));
    specifications = specificationListSchema.safeParse(JSON.parse(String(formData.get('specificationsJson') ?? '[]')));
  } catch {
    return { error: 'Something went wrong reading the form. Please refresh and try again.' } as const;
  }

  if (!compatibility.success) {
    return { error: compatibility.error.issues.map((issue) => issue.message).join(', ') } as const;
  }
  if (!specifications.success) {
    return { error: specifications.error.issues.map((issue) => issue.message).join(', ') } as const;
  }

  return { compatibility: compatibility.data, specifications: specifications.data } as const;
}

/** Replace-in-place: the editor always posts the full intended set. */
async function writeRepeaters(
  productId: string,
  compatibility: { brandId: string; instrumentModelId: string | null; note: string | null }[],
  specifications: { group: string; label: string; value: string; unit: string }[],
) {
  await prisma.$transaction([
    prisma.productCompatibility.deleteMany({ where: { productId } }),
    prisma.productSpecification.deleteMany({ where: { productId } }),
    ...(compatibility.length > 0
      ? [
          prisma.productCompatibility.createMany({
            data: compatibility.map((row) => ({
              productId,
              brandId: row.brandId,
              instrumentModelId: row.instrumentModelId,
              note: row.note,
            })),
            skipDuplicates: true,
          }),
        ]
      : []),
    ...(specifications.length > 0
      ? [
          prisma.productSpecification.createMany({
            data: specifications.map((row, index) => ({
              productId,
              group: row.group.trim() || null,
              label: row.label.trim(),
              value: row.value.trim(),
              unit: row.unit.trim() || null,
              sortOrder: index,
            })),
          }),
        ]
      : []),
  ]);
}

function parseProductForm(formData: FormData) {
  return productFormSchema.safeParse({
    sku: formData.get('sku'),
    slug: formData.get('slug'),
    name: formData.get('name'),
    kind: formData.get('kind'),
    categoryId: formData.get('categoryId'),
    brandId: String(formData.get('brandId') ?? ''),
    description: formData.get('description'),
    priceRupees: String(formData.get('priceRupees') ?? ''),
    stockStatus: formData.get('stockStatus'),
    stockQuantity: String(formData.get('stockQuantity') ?? '0'),
    isPublished: formData.get('isPublished') === 'true',
    seoTitle: String(formData.get('seoTitle') ?? ''),
    seoDescription: String(formData.get('seoDescription') ?? ''),
  });
}

export async function createProduct(_prevState: ProductFormState | undefined, formData: FormData): Promise<ProductFormState> {
  await requireRole(Role.ADMIN);

  const validated = parseProductForm(formData);
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, values: formValues(formData) };
  }

  const data = validated.data;
  const existingSku = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (existingSku) {
    return { errors: { sku: ['A product with this SKU already exists.'] }, values: formValues(formData) };
  }
  const existingSlug = await prisma.product.findUnique({ where: { slug: data.slug } });
  if (existingSlug) {
    return { errors: { slug: ['A product with this slug already exists.'] }, values: formValues(formData) };
  }

  const imageFile = formData.get('image');
  const upload = await saveUploadedImage(imageFile instanceof File ? imageFile : null, 'products');
  if (upload.error) {
    return { errors: { image: [upload.error] }, values: formValues(formData) };
  }

  const repeaters = parseRepeaters(formData);
  if ('error' in repeaters) {
    return { formError: repeaters.error, values: formValues(formData) };
  }

  const created = await prisma.product.create({
    data: {
      sku: data.sku,
      slug: data.slug,
      name: data.name,
      kind: data.kind,
      categoryId: data.categoryId,
      brandId: data.brandId || null,
      description: data.description,
      images: upload.url ? [upload.url] : [],
      priceMinor: parsePriceMinor(data.priceRupees),
      stockStatus: data.stockStatus,
      stockQuantity: data.stockQuantity,
      isPublished: data.isPublished,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
    },
  });

  await writeRepeaters(created.id, repeaters.compatibility, repeaters.specifications);

  revalidatePath('/admin/products');
  revalidatePath('/products');
  revalidatePath('/spare-parts');
  redirect('/admin/products');
}

export async function updateProduct(id: string, _prevState: ProductFormState | undefined, formData: FormData): Promise<ProductFormState> {
  await requireRole(Role.ADMIN);

  const validated = parseProductForm(formData);
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors, values: formValues(formData) };
  }

  const data = validated.data;
  const skuOwner = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (skuOwner && skuOwner.id !== id) {
    return { errors: { sku: ['A product with this SKU already exists.'] }, values: formValues(formData) };
  }
  const slugOwner = await prisma.product.findUnique({ where: { slug: data.slug } });
  if (slugOwner && slugOwner.id !== id) {
    return { errors: { slug: ['A product with this slug already exists.'] }, values: formValues(formData) };
  }

  const imageFile = formData.get('image');
  const upload = await saveUploadedImage(imageFile instanceof File ? imageFile : null, 'products');
  if (upload.error) {
    return { errors: { image: [upload.error] }, values: formValues(formData) };
  }

  const repeaters = parseRepeaters(formData);
  if ('error' in repeaters) {
    return { formError: repeaters.error, values: formValues(formData) };
  }

  await prisma.product.update({
    where: { id },
    data: {
      sku: data.sku,
      slug: data.slug,
      name: data.name,
      kind: data.kind,
      categoryId: data.categoryId,
      brandId: data.brandId || null,
      description: data.description,
      ...(upload.url ? { images: [upload.url] } : {}),
      priceMinor: parsePriceMinor(data.priceRupees),
      stockStatus: data.stockStatus,
      stockQuantity: data.stockQuantity,
      isPublished: data.isPublished,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
    },
  });

  await writeRepeaters(id, repeaters.compatibility, repeaters.specifications);

  revalidatePath('/admin/products');
  revalidatePath('/products');
  revalidatePath('/spare-parts');
  redirect('/admin/products');
}

export async function deleteProduct(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  await prisma.product.delete({ where: { id } });
  revalidatePath('/admin/products');
}

export async function toggleProductPublished(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const product = await prisma.product.findUnique({ where: { id }, select: { isPublished: true } });
  if (!product) return;

  await prisma.product.update({ where: { id }, data: { isPublished: !product.isPublished } });
  revalidatePath('/admin/products');
  revalidatePath('/products');
  revalidatePath('/spare-parts');
}
