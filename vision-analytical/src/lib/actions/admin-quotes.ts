'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/dal';
import { setQuoteStatusSchema, convertQuoteSchema } from '@/lib/validation/admin-quotes';
import { generateReferenceNumber } from '@/lib/reference-number';
import { Role, QuoteStatus, OrderStatus } from '@/generated/prisma/client';

export async function updateQuotePricing(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  const quoteId = String(formData.get('quoteId') ?? '');
  if (!quoteId) return;

  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { items: true } });
  if (!quote) return;

  let totalMinor = 0;
  const priceByItemId = new Map<string, number | null>();
  for (const item of quote.items) {
    const raw = formData.get(`price_${item.id}`);
    const rupees = typeof raw === 'string' && raw.trim() ? Number(raw) : null;
    const unitPriceMinor = rupees !== null && !Number.isNaN(rupees) ? Math.round(rupees * 100) : null;
    priceByItemId.set(item.id, unitPriceMinor);
    if (unitPriceMinor !== null) totalMinor += unitPriceMinor * item.quantity;
  }

  await prisma.$transaction([
    ...quote.items.map((item) =>
      prisma.quoteItem.update({ where: { id: item.id }, data: { unitPriceMinor: priceByItemId.get(item.id) ?? null } }),
    ),
    prisma.quote.update({
      where: { id: quoteId },
      data: {
        totalMinor,
        status: QuoteStatus.SENT,
        validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  revalidatePath(`/admin/quotes/${quoteId}`);
  revalidatePath('/admin/quotes');
  revalidatePath('/portal/quotes');
}

export async function setQuoteStatus(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);

  const validated = setQuoteStatusSchema.safeParse({
    quoteId: formData.get('quoteId'),
    status: formData.get('status'),
  });
  if (!validated.success) return;

  const { quoteId, status } = validated.data;
  await prisma.quote.update({ where: { id: quoteId }, data: { status } });

  revalidatePath(`/admin/quotes/${quoteId}`);
  revalidatePath('/admin/quotes');
  revalidatePath('/portal/quotes');
}

export interface ConvertQuoteFormState {
  errors?: Record<string, string[] | undefined>;
  formError?: string;
}

export async function convertQuoteToOrder(
  _prevState: ConvertQuoteFormState | undefined,
  formData: FormData,
): Promise<ConvertQuoteFormState> {
  await requireRole(Role.ADMIN);

  const validated = convertQuoteSchema.safeParse({
    quoteId: formData.get('quoteId'),
    line1: formData.get('line1'),
    city: formData.get('city'),
    state: formData.get('state'),
    postalCode: formData.get('postalCode'),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { quoteId, line1, city, state, postalCode } = validated.data;

  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { items: true } });
  if (!quote) {
    return { formError: 'Quote not found.' };
  }
  if (quote.status !== QuoteStatus.ACCEPTED) {
    return { formError: 'Only accepted quotes can be converted to an order.' };
  }
  if (!quote.customerId) {
    return { formError: 'This quote has no linked customer account and cannot be converted yet.' };
  }

  const address = { line1, city, state, postalCode, country: 'India' };
  const items = quote.items.map((item) => ({
    productId: item.productId,
    refurbishedInstrumentId: item.refurbishedInstrumentId,
    nameSnapshot: item.description,
    unitPriceMinor: item.unitPriceMinor ?? 0,
    quantity: item.quantity,
    lineTotalMinor: (item.unitPriceMinor ?? 0) * item.quantity,
  }));
  const totalMinor = items.reduce((sum, item) => sum + item.lineTotalMinor, 0);

  const order = await prisma.order.create({
    data: {
      orderNumber: generateReferenceNumber('ORD'),
      customerId: quote.customerId,
      status: OrderStatus.CONFIRMED,
      subtotalMinor: totalMinor,
      totalMinor,
      shippingAddress: address,
      billingAddress: address,
      sourceQuoteId: quote.id,
      items: { create: items },
    },
  });

  await prisma.quote.update({ where: { id: quoteId }, data: { status: QuoteStatus.CONVERTED } });

  revalidatePath('/admin/orders');
  revalidatePath('/admin/quotes');
  revalidatePath('/portal/orders');
  redirect(`/admin/orders/${order.id}`);
}
