import type { Metadata } from 'next';
import { ProductForm } from '@/components/forms/ProductForm';
import { getAllCategories } from '@/lib/data/admin-products';

export const metadata: Metadata = { title: 'New Product' };

export default async function NewProductPage() {
  const categories = await getAllCategories();
  return <ProductForm categories={categories} />;
}
