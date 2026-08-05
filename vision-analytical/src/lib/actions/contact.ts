'use server';

import { prisma } from '@/lib/db';
import { contactMessageSchema } from '@/lib/validation/contact';

export interface ContactFormState {
  errors?: Record<string, string[] | undefined>;
  success?: boolean;
}

export async function submitContactMessage(
  _prevState: ContactFormState | undefined,
  formData: FormData,
): Promise<ContactFormState> {
  const validated = contactMessageSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: String(formData.get('phone') ?? ''),
    subject: String(formData.get('subject') ?? ''),
    message: formData.get('message'),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { name, email, phone, subject, message } = validated.data;

  await prisma.contactMessage.create({
    data: {
      name,
      email,
      phone: phone || null,
      subject: subject || null,
      message,
    },
  });

  return { success: true };
}
