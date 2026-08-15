import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { InstrumentModelForm } from '@/components/forms/InstrumentModelForm';
import { getInstrumentModelById } from '@/lib/data/instrument-models';
import { getAllBrands } from '@/lib/data/brands';
import { getInstrumentCategories } from '@/lib/data/products';

export const metadata: Metadata = { title: 'Edit Instrument Model' };

export default async function AdminEditInstrumentModelPage(
  props: PageProps<'/admin/products/instrument-models/[id]'>,
) {
  const { id } = await props.params;
  const [model, brands, categories] = await Promise.all([
    getInstrumentModelById(id),
    getAllBrands(),
    getInstrumentCategories(),
  ]);
  if (!model) notFound();

  return <InstrumentModelForm brands={brands} categories={categories} model={model} />;
}
