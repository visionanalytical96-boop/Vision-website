import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RefurbishedForm } from '@/components/forms/RefurbishedForm';
import { getAdminRefurbishedById, getAllCategories } from '@/lib/data/admin-products';
import { getAllBrands } from '@/lib/data/brands';

export const metadata: Metadata = { title: 'Edit Refurbished Instrument' };

export default async function EditRefurbishedPage(props: PageProps<'/admin/products/refurbished/[id]'>) {
  const { id } = await props.params;
  const [instrument, categories, brands] = await Promise.all([getAdminRefurbishedById(id), getAllCategories(), getAllBrands()]);
  if (!instrument) notFound();

  return <RefurbishedForm categories={categories} brands={brands} instrument={instrument} />;
}
