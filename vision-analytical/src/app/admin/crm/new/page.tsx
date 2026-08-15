import type { Metadata } from 'next';
import { NewLeadForm } from '@/components/forms/NewLeadForm';
import { getAssignableStaff } from '@/lib/data/admin-crm';

export const metadata: Metadata = { title: 'New Lead' };

export default async function NewLeadPage() {
  const staff = await getAssignableStaff();
  return <NewLeadForm staff={staff} />;
}
