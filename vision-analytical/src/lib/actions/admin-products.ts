'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/dal';
import { productFormSchema } from '@/lib/validation/admin-products';
import { saveUploadedImage } from '@/lib/upload-image';
import { Role } from '@/generated/prisma/client';

export interface ProductFormState {
  errors?: Record<string, string[] | undefined>;
  formError?: string;
}

function parsePriceMinor(priceRupees: string | undefined): number | null {
  if (!priceRupees) return null;
  const parsed = Number(priceRupees);
  if (Number.isNaN(parsed)) return null;
  return Math.round(parsed * 100);
}

function parseProductForm(formData: FormData) {
  return productFormSchema.safeParse({
    sku: formData.get('sku'),
    slug: formData.get('slug'),
    name: formData.get('name'),
    kind: formData.get('kind'),
    categoryId: formData.get('categoryId'),
    brandId: String(formData.get('brandId') ?? ''),
    compatibleBrands: String(formData.get('compatibleBrands') ?? ''),
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
    return { errors: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;
  const existingSku = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (existingSku) {
    return { errors: { sku: ['A product with this SKU already exists.'] } };
  }
  const existingSlug = await prisma.product.findUnique({ where: { slug: data.slug } });
  if (existingSlug) {
    return { errors: { slug: ['A product with this slug already exists.'] } };
  }

  const imageFile = formData.get('image');
  const upload = await saveUploadedImage(imageFile instanceof File ? imageFile : null, 'products');
  if (upload.error) {
    return { errors: { image: [upload.error] } };
  }

  await prisma.product.create({
    data: {
      sku: data.sku,
      slug: data.slug,
      name: data.name,
      kind: data.kind,
      categoryId: data.categoryId,
      brandId: data.brandId || null,
      compatibleBrands: data.compatibleBrands
        ? data.compatibleBrands.split(',').map((b) => b.trim()).filter(Boolean)
        : [],
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

  revalidatePath('/admin/products');
  redirect('/admin/products');
}

export async function updateProduct(id: string, _prevState: ProductFormState | undefined, formData: FormData): Promise<ProductFormState> {
  await requireRole(Role.ADMIN);

  const validated = parseProductForm(formData);
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;
  const skuOwner = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (skuOwner && skuOwner.id !== id) {
    return { errors: { sku: ['A product with this SKU already exists.'] } };
  }
  const slugOwner = await prisma.product.findUnique({ where: { slug: data.slug } });
  if (slugOwner && slugOwner.id !== id) {
    return { errors: { slug: ['A product with this slug already exists.'] } };
  }

  const imageFile = formData.get('image');
  const upload = await saveUploadedImage(imageFile instanceof File ? imageFile : null, 'products');
  if (upload.error) {
    return { errors: { image: [upload.error] } };
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
      compatibleBrands: data.compatibleBrands
        ? data.compatibleBrands.split(',').map((b) => b.trim()).filter(Boolean)
        : [],
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
