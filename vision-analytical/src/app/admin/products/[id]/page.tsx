import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductForm } from '@/components/forms/ProductForm';
import { getAdminProductById, getAllCategories } from '@/lib/data/admin-products';

export const metadata: Metadata = { title: 'Edit Product' };

export default async function EditProductPage(props: PageProps<'/admin/products/[id]'>) {
  const { id } = await props.params;
  const [product, categories] = await Promise.all([getAdminProductById(id), getAllCategories()]);
  if (!product) notFound();

  return <ProductForm categories={categories} product={product} />;
}
