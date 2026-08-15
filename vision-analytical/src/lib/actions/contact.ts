'use server';

import { prisma } from '@/lib/db';
import { contactMessageSchema } from '@/lib/validation/contact';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export interface ContactFormState {
  errors?: Record<string, string[] | undefined>;
  formError?: string;
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

  const ip = await getClientIp();
  if (!checkRateLimit(`contact:ip:${ip}`, 5, 10 * 60 * 1000)) {
    return { formError: 'Too many messages sent. Please wait a few minutes and try again.' };
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
