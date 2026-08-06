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
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { type, priority, instrumentDescription, description } = validated.data;

  const serviceRequest = await prisma.serviceRequest.create({
    data: {
      ticketNumber: generateReferenceNumber('SR'),
      customerId: session.userId,
      type,
      priority,
      instrumentDescription,
      description,
    },
  });

  redirect(`/portal/service-requests/${serviceRequest.id}`);
}
