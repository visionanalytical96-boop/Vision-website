import type { Metadata } from 'next';
import { InstrumentModelForm } from '@/components/forms/InstrumentModelForm';
import { getAllBrands } from '@/lib/data/brands';
import { getInstrumentCategories } from '@/lib/data/products';

export const metadata: Metadata = { title: 'Add Instrument Model' };

export default async function AdminNewInstrumentModelPage() {
  const [brands, categories] = await Promise.all([getAllBrands(), getInstrumentCategories()]);
  return <InstrumentModelForm brands={brands} categories={categories} />;
}
