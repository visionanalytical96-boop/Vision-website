import type { Metadata } from 'next';
import { ProductForm } from '@/components/forms/ProductForm';
import { getAllCategories, getInstrumentModelOptions } from '@/lib/data/admin-products';
import { getAllBrands } from '@/lib/data/brands';

export const metadata: Metadata = { title: 'New Product' };

export default async function NewProductPage() {
  const [categories, brands, instrumentModels] = await Promise.all([
    getAllCategories(),
    getAllBrands(),
    getInstrumentModelOptions(),
  ]);
  return <ProductForm categories={categories} brands={brands} instrumentModels={instrumentModels} />;
}
