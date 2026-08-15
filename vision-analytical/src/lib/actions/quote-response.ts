'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/dal';
import { QuoteStatus } from '@/generated/prisma/client';

async function respond(formData: FormData, nextStatus: typeof QuoteStatus.ACCEPTED | typeof QuoteStatus.REJECTED) {
  const session = await requireSession();
  const quoteId = String(formData.get('quoteId') ?? '');
  if (!quoteId) return;

  const quote = await prisma.quote.findFirst({ where: { id: quoteId, customerId: session.userId, status: QuoteStatus.SENT } });
  if (!quote) return;

  await prisma.quote.update({ where: { id: quoteId }, data: { status: nextStatus } });

  revalidatePath(`/portal/quotes/${quoteId}`);
  revalidatePath('/portal/quotes');
  revalidatePath('/admin/quotes');
}

export async function acceptQuote(formData: FormData): Promise<void> {
  await respond(formData, QuoteStatus.ACCEPTED);
}

export async function rejectQuote(formData: FormData): Promise<void> {
  await respond(formData, QuoteStatus.REJECTED);
}
