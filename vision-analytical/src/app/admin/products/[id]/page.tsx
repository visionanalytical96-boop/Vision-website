import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductForm } from '@/components/forms/ProductForm';
import { getAdminProductById, getAllCategories, getInstrumentModelOptions } from '@/lib/data/admin-products';
import { getAllBrands } from '@/lib/data/brands';

export const metadata: Metadata = { title: 'Edit Product' };

export default async function EditProductPage(props: PageProps<'/admin/products/[id]'>) {
  const { id } = await props.params;
  const [product, categories, brands, instrumentModels] = await Promise.all([
    getAdminProductById(id),
    getAllCategories(),
    getAllBrands(),
    getInstrumentModelOptions(),
  ]);
  if (!product) notFound();

  return (
    <ProductForm
      categories={categories}
      brands={brands}
      instrumentModels={instrumentModels}
      product={product}
      compatibility={product.compatibility.map((row) => ({
        brandId: row.brandId,
        instrumentModelId: row.instrumentModelId ?? '',
        note: row.note ?? '',
      }))}
      specifications={product.specifications.map((row) => ({
        group: row.group ?? '',
        label: row.label,
        value: row.value,
        unit: row.unit ?? '',
      }))}
    />
  );
}
