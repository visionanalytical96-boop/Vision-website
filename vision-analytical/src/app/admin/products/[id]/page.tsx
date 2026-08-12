import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductForm } from '@/components/forms/ProductForm';
import { getAdminProductById, getAllCategories } from '@/lib/data/admin-products';
import { getAllBrands } from '@/lib/data/brands';

export const metadata: Metadata = { title: 'Edit Product' };

export default async function EditProductPage(props: PageProps<'/admin/products/[id]'>) {
  const { id } = await props.params;
  const [product, categories, brands] = await Promise.all([getAdminProductById(id), getAllCategories(), getAllBrands()]);
  if (!product) notFound();

  return <ProductForm categories={categories} brands={brands} product={product} />;
}
