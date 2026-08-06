'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/dal';
import { generateReferenceNumber } from '@/lib/reference-number';
import { createAmcContractSchema, updateAmcStatusSchema } from '@/lib/validation/admin-amc';
import { Role } from '@/generated/prisma/client';

export interface AmcContractFormState {
  errors?: Record<string, string[] | undefined>;
  formError?: string;
}

function parsePriceMinor(priceRupees: string | undefined): number | null {
  if (!priceRupees) return null;
  const parsed = Number(priceRupees);
  if (Number.isNaN(parsed)) return null;
  return Math.round(parsed * 100);
}

export async function createAmcContract(_prevState: AmcContractFormState | undefined, formData: FormData): Promise<AmcContractFormState> {
  await requireRole(Role.ADMIN);

  const validated = createAmcContractSchema.safeParse({
    customerId: formData.get('customerId'),
    type: formData.get('type'),
    instrumentDescription: formData.get('instrumentDescription'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
    visitsIncluded: String(formData.get('visitsIncluded') ?? ''),
    priceRupees: String(formData.get('priceRupees') ?? ''),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { customerId, type, instrumentDescription, startDate, endDate, visitsIncluded, priceRupees } = validated.data;

  const customer = await prisma.user.findFirst({ where: { id: customerId, role: Role.CUSTOMER } });
  if (!customer) {
    return { errors: { customerId: ['Choose a valid customer.'] } };
  }

  const contract = await prisma.amcContract.create({
    data: {
      contractNumber: generateReferenceNumber(type),
      customerId,
      type,
      instrumentDescription,
      startDate,
      endDate,
      visitsIncluded,
      priceMinor: parsePriceMinor(priceRupees),
    },
  });

  revalidatePath('/admin/amc');
  revalidatePath('/portal/amc');
  redirect(`/admin/amc/${contract.id}`);
}

export async function updateAmcStatus(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);

  const validated = updateAmcStatusSchema.safeParse({
    contractId: formData.get('contractId'),
    status: formData.get('status'),
  });
  if (!validated.success) return;

  const { contractId, status } = validated.data;
  await prisma.amcContract.update({ where: { id: contractId }, data: { status } });

  revalidatePath(`/admin/amc/${contractId}`);
  revalidatePath('/admin/amc');
  revalidatePath('/portal/amc');
}
