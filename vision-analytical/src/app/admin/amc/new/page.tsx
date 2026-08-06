import type { Metadata } from 'next';
import { NewAmcContractForm } from '@/components/forms/NewAmcContractForm';
import { getCustomerOptions } from '@/lib/data/admin-amc';

export const metadata: Metadata = { title: 'New AMC / CMC Contract' };

export default async function NewAmcContractPage() {
  const customers = await getCustomerOptions();
  return <NewAmcContractForm customers={customers} />;
}
