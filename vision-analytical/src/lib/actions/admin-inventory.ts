'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/dal';
import { stockMovementFormSchema, supplierFormSchema } from '@/lib/validation/admin-inventory';
import { Role, StockStatus } from '@/generated/prisma/client';

export interface StockMovementFormState {
  errors?: Record<string, string[] | undefined>;
  formError?: string;
}

function stockStatusForQuantity(quantity: number): StockStatus {
  if (quantity <= 0) return StockStatus.OUT_OF_STOCK;
  if (quantity <= 5) return StockStatus.LOW_STOCK;
  return StockStatus.IN_STOCK;
}

export async function recordStockMovement(
  _prevState: StockMovementFormState | undefined,
  formData: FormData,
): Promise<StockMovementFormState> {
  const session = await requireRole(Role.ADMIN);

  const validated = stockMovementFormSchema.safeParse({
    productId: formData.get('productId'),
    type: formData.get('type'),
    quantity: formData.get('quantity'),
    note: String(formData.get('note') ?? ''),
  });

  if (!validated.success) {
    return { formError: validated.error.issues[0]?.message ?? 'Could not record this movement.' };
  }

  const { productId, type, quantity, note } = validated.data;

  await prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id: productId },
      data: { stockQuantity: { increment: quantity } },
    });

    await tx.product.update({
      where: { id: productId },
      data: { stockStatus: stockStatusForQuantity(updated.stockQuantity) },
    });

    await tx.stockMovement.create({
      data: { productId, type, quantity, note: note || null, createdById: session.userId },
    });
  });

  revalidatePath('/admin/inventory');
  revalidatePath('/admin/products');
  return {};
}

export interface SupplierFormState {
  errors?: Record<string, string[] | undefined>;
}

export async function createSupplier(_prevState: SupplierFormState | undefined, formData: FormData): Promise<SupplierFormState> {
  await requireRole(Role.ADMIN);

  const validated = supplierFormSchema.safeParse({
    name: formData.get('name'),
    contactName: String(formData.get('contactName') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    address: String(formData.get('address') ?? ''),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { name, contactName, email, phone, address } = validated.data;

  await prisma.supplier.create({
    data: {
      name,
      contactName: contactName || null,
      email: email || null,
      phone: phone || null,
      address: address || null,
    },
  });

  revalidatePath('/admin/inventory/suppliers');
  return {};
}
