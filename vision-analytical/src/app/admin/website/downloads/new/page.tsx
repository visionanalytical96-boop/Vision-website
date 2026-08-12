import type { Metadata } from 'next';
import { DownloadForm } from '@/components/forms/DownloadForm';
import { getDownloadFormOptions } from '@/lib/data/admin-downloads';

export const metadata: Metadata = { title: 'Add Download' };

export default async function AdminNewDownloadPage() {
  const { brands, categories, products } = await getDownloadFormOptions();
  return <DownloadForm brands={brands} categories={categories} products={products} />;
}
