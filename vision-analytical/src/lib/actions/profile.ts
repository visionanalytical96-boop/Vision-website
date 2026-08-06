'use server';

import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/dal';
import { updateProfileSchema } from '@/lib/validation/profile';

export interface ProfileFormState {
  errors?: Record<string, string[] | undefined>;
  success?: boolean;
}

export async function updateProfile(
  _prevState: ProfileFormState | undefined,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await requireSession();

  const validated = updateProfileSchema.safeParse({
    name: formData.get('name'),
    phone: String(formData.get('phone') ?? ''),
    companyName: String(formData.get('companyName') ?? ''),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { name, phone, companyName } = validated.data;

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      name,
      phone: phone || null,
      companyName: companyName || null,
    },
  });

  return { success: true };
}
