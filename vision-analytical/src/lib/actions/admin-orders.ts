'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/dal';
import { updateOrderStatusSchema, createInvoiceSchema } from '@/lib/validation/admin-orders';
import { generateReferenceNumber } from '@/lib/reference-number';
import { Role } from '@/generated/prisma/client';

export async function updateOrderStatus(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);

  const validated = updateOrderStatusSchema.safeParse({
    orderId: formData.get('orderId'),
    status: formData.get('status'),
  });
  if (!validated.success) return;

  const { orderId, status } = validated.data;
  await prisma.order.update({ where: { id: orderId }, data: { status } });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  revalidatePath('/portal/orders');
}

export async function createInvoiceForOrder(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);

  const validated = createInvoiceSchema.safeParse({
    orderId: formData.get('orderId'),
    status: formData.get('status'),
    dueInDays: String(formData.get('dueInDays') ?? '15'),
  });
  if (!validated.success) return;

  const { orderId, status, dueInDays } = validated.data;
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  await prisma.invoice.create({
    data: {
      invoiceNumber: generateReferenceNumber('INV'),
      customerId: order.customerId,
      orderId: order.id,
      amountMinor: order.totalMinor,
      status,
      dueAt: new Date(Date.now() + dueInDays * 24 * 60 * 60 * 1000),
    },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/portal/invoices');
}
