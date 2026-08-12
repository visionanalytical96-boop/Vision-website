import type { Metadata } from 'next';
import { RefurbishedForm } from '@/components/forms/RefurbishedForm';
import { getAllCategories } from '@/lib/data/admin-products';
import { getAllBrands } from '@/lib/data/brands';

export const metadata: Metadata = { title: 'Add Refurbished Instrument' };

export default async function NewRefurbishedPage() {
  const [categories, brands] = await Promise.all([getAllCategories(), getAllBrands()]);
  return <RefurbishedForm categories={categories} brands={brands} />;
}
