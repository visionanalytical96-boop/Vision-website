'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/dal';
import { generateReferenceNumber } from '@/lib/reference-number';
import { newServiceRequestSchema } from '@/lib/validation/service-requests';
import { Role } from '@/generated/prisma/client';

export interface ServiceRequestFormState {
  errors?: Record<string, string[] | undefined>;
  formError?: string;
}

export async function createServiceRequest(
  _prevState: ServiceRequestFormState | undefined,
  formData: FormData,
): Promise<ServiceRequestFormState> {
  const session = await requireSession();
  if (session.role !== Role.CUSTOMER) {
    return { formError: 'Only customer accounts can raise a service request.' };
  }

  const validated = newServiceRequestSchema.safeParse({
    type: formData.get('type'),
    priority: formData.get('priority'),
    instrumentDescription: formData.get('instrumentDescription'),
    description: formData.get('description'),
    amcContractId: formData.get('amcContractId'),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { type, priority, instrumentDescription, description, amcContractId } = validated.data;

  let linkedAmcContractId: string | null = null;
  if (amcContractId) {
    const contract = await prisma.amcContract.findFirst({ where: { id: amcContractId, customerId: session.userId } });
    if (!contract) {
      return { formError: 'That contract could not be found on your account.' };
    }
    linkedAmcContractId = contract.id;
  }

  const serviceRequest = await prisma.serviceRequest.create({
    data: {
      ticketNumber: generateReferenceNumber('SR'),
      customerId: session.userId,
      type,
      priority,
      instrumentDescription,
      description,
      amcContractId: linkedAmcContractId,
    },
  });

  redirect(`/portal/service-requests/${serviceRequest.id}`);
}
