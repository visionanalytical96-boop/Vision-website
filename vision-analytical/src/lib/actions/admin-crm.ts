'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/dal';
import { createLeadSchema, updateLeadStatusSchema, assignLeadSchema, logActivitySchema } from '@/lib/validation/admin-crm';
import { Role } from '@/generated/prisma/client';

export interface LeadFormState {
  errors?: Record<string, string[] | undefined>;
  formError?: string;
}

export async function createLead(_prevState: LeadFormState | undefined, formData: FormData): Promise<LeadFormState> {
  await requireRole(Role.ADMIN);

  const validated = createLeadSchema.safeParse({
    name: formData.get('name'),
    company: formData.get('company'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    source: formData.get('source'),
    notes: formData.get('notes'),
    assignedToId: formData.get('assignedToId'),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { name, company, email, phone, source, notes, assignedToId } = validated.data;

  const lead = await prisma.crmLead.create({
    data: {
      name,
      company: company || null,
      email: email || null,
      phone: phone || null,
      source: source || null,
      notes: notes || null,
      assignedToId: assignedToId || null,
    },
  });

  revalidatePath('/admin/crm');
  redirect(`/admin/crm/${lead.id}`);
}

export async function updateLeadStatus(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);

  const validated = updateLeadStatusSchema.safeParse({
    leadId: formData.get('leadId'),
    status: formData.get('status'),
  });
  if (!validated.success) return;

  const { leadId, status } = validated.data;
  await prisma.crmLead.update({ where: { id: leadId }, data: { status } });

  revalidatePath(`/admin/crm/${leadId}`);
  revalidatePath('/admin/crm');
}

export async function assignLead(formData: FormData): Promise<void> {
  await requireRole(Role.ADMIN);

  const validated = assignLeadSchema.safeParse({
    leadId: formData.get('leadId'),
    assignedToId: formData.get('assignedToId'),
  });
  if (!validated.success) return;

  const { leadId, assignedToId } = validated.data;
  await prisma.crmLead.update({ where: { id: leadId }, data: { assignedToId: assignedToId || null } });

  revalidatePath(`/admin/crm/${leadId}`);
  revalidatePath('/admin/crm');
}

export interface LogActivityFormState {
  errors?: Record<string, string[] | undefined>;
  formError?: string;
}

export async function logActivity(_prevState: LogActivityFormState | undefined, formData: FormData): Promise<LogActivityFormState> {
  const session = await requireRole(Role.ADMIN);

  const validated = logActivitySchema.safeParse({
    leadId: formData.get('leadId'),
    type: formData.get('type'),
    notes: formData.get('notes'),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { leadId, type, notes } = validated.data;

  const lead = await prisma.crmLead.findUnique({ where: { id: leadId }, select: { id: true } });
  if (!lead) {
    return { formError: 'Lead not found.' };
  }

  await prisma.crmActivity.create({
    data: { leadId, type, notes, createdById: session.userId },
  });

  revalidatePath(`/admin/crm/${leadId}`);
  return {};
}
