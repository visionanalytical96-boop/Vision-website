'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/dal';
import { hashPassword } from '@/lib/password';
import { createEngineerSchema } from '@/lib/validation/admin-engineers';
import { Role } from '@/generated/prisma/client';

export interface EngineerFormState {
  errors?: Record<string, string[] | undefined>;
  formError?: string;
}

export async function createEngineer(_prevState: EngineerFormState | undefined, formData: FormData): Promise<EngineerFormState> {
  await requireRole(Role.ADMIN);

  const validated = createEngineerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: String(formData.get('phone') ?? ''),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { name, email, phone, password } = validated.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { errors: { email: ['An account with this email already exists.'] } };
  }

  const passwordHash = await hashPassword(password);
  const engineer = await prisma.user.create({
    data: { name, email, phone: phone || null, passwordHash, role: Role.ENGINEER },
  });

  revalidatePath('/admin/engineers');
  redirect(`/admin/engineers/${engineer.id}`);
}

export async function toggleEngineerActive(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const engineer = await prisma.user.findFirst({ where: { id, role: Role.ENGINEER }, select: { isActive: true } });
  if (!engineer) return;

  await prisma.user.update({ where: { id }, data: { isActive: !engineer.isActive } });
  revalidatePath('/admin/engineers');
  revalidatePath(`/admin/engineers/${id}`);
}
