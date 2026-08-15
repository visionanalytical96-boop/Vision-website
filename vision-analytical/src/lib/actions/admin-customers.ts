'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/dal';
import { Role } from '@/generated/prisma/client';

export async function toggleCustomerActive(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const user = await prisma.user.findFirst({ where: { id, role: Role.CUSTOMER }, select: { isActive: true } });
  if (!user) return;

  await prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
  revalidatePath('/admin/customers');
  revalidatePath(`/admin/customers/${id}`);
}
