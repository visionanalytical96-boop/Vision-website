'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/dal';
import { generateReferenceNumber } from '@/lib/reference-number';
import { quoteContactSchema, cartItemsSchema } from '@/lib/validation/quotes';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export interface QuoteRequestState {
  errors?: Record<string, string[] | undefined>;
  formError?: string;
  quoteNumber?: string;
}

export async function submitQuoteRequest(
  _prevState: QuoteRequestState | undefined,
  formData: FormData,
): Promise<QuoteRequestState> {
  const contactValidated = quoteContactSchema.safeParse({
    contactName: formData.get('contactName'),
    contactEmail: formData.get('contactEmail'),
    contactPhone: String(formData.get('contactPhone') ?? ''),
    notes: String(formData.get('notes') ?? ''),
  });

  if (!contactValidated.success) {
    return { errors: contactValidated.error.flatten().fieldErrors };
  }

  const ip = await getClientIp();
  if (!checkRateLimit(`quote-request:ip:${ip}`, 10, 10 * 60 * 1000)) {
    return { formError: 'Too many quote requests sent. Please wait a few minutes and try again.' };
  }

  let rawItems: unknown;
  try {
    rawItems = JSON.parse(String(formData.get('items') ?? '[]'));
  } catch {
    return { formError: 'Something went wrong reading your cart. Please refresh and try again.' };
  }

  const itemsValidated = cartItemsSchema.safeParse(rawItems);
  if (!itemsValidated.success) {
    return { formError: 'Add at least one item describing what you need.' };
  }

  const { contactName, contactEmail, contactPhone, notes } = contactValidated.data;
  const items = itemsValidated.data;
  const session = await getSession();

  const quote = await prisma.quote.create({
    data: {
      quoteNumber: generateReferenceNumber('QT'),
      customerId: session?.userId,
      contactName,
      contactEmail,
      contactPhone: contactPhone || null,
      notes: notes || null,
      items: {
        create: items.map((item) => ({
          description: item.name,
          quantity: item.quantity,
          productId: item.kind === 'PRODUCT' ? item.id : undefined,
          refurbishedInstrumentId: item.kind === 'REFURBISHED' ? item.id : undefined,
        })),
      },
    },
  });

  return { quoteNumber: quote.quoteNumber };
}
