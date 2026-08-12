import type { Metadata } from 'next';
import { ProductForm } from '@/components/forms/ProductForm';
import { getAllCategories } from '@/lib/data/admin-products';
import { getAllBrands } from '@/lib/data/brands';

export const metadata: Metadata = { title: 'New Product' };

export default async function NewProductPage() {
  const [categories, brands] = await Promise.all([getAllCategories(), getAllBrands()]);
  return <ProductForm categories={categories} brands={brands} />;
}
