import type { Metadata } from 'next';
import { RefurbishedForm } from '@/components/forms/RefurbishedForm';
import { getAllCategories } from '@/lib/data/admin-products';

export const metadata: Metadata = { title: 'Add Refurbished Instrument' };

export default async function NewRefurbishedPage() {
  const categories = await getAllCategories();
  return <RefurbishedForm categories={categories} />;
}
