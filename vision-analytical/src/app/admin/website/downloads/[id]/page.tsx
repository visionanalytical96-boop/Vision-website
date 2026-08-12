import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DownloadForm } from '@/components/forms/DownloadForm';
import { getDownloadById } from '@/lib/data/downloads';
import { getDownloadFormOptions } from '@/lib/data/admin-downloads';

export const metadata: Metadata = { title: 'Edit Download' };

export default async function AdminEditDownloadPage(props: PageProps<'/admin/website/downloads/[id]'>) {
  const { id } = await props.params;
  const [download, options] = await Promise.all([getDownloadById(id), getDownloadFormOptions()]);
  if (!download) notFound();

  return <DownloadForm download={download} brands={options.brands} categories={options.categories} />;
}
