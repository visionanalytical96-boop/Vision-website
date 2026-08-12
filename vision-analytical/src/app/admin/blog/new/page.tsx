import type { Metadata } from 'next';
import { BlogPostForm } from '@/components/forms/BlogPostForm';
import { getArticleLinkOptions } from '@/lib/data/admin-blog';

export const metadata: Metadata = { title: 'New Article' };

export default async function NewBlogPostPage() {
  const { brands, models, products } = await getArticleLinkOptions();
  return <BlogPostForm brands={brands} models={models} products={products} />;
}
