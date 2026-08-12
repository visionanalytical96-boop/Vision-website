import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogPostForm } from '@/components/forms/BlogPostForm';
import { getAdminBlogPostById, getArticleLinkOptions } from '@/lib/data/admin-blog';

export const metadata: Metadata = { title: 'Edit Article' };

export default async function EditBlogPostPage(props: PageProps<'/admin/blog/[id]'>) {
  const { id } = await props.params;
  const [post, options] = await Promise.all([getAdminBlogPostById(id), getArticleLinkOptions()]);
  if (!post) notFound();

  return (
    <BlogPostForm
      post={post}
      brands={options.brands}
      models={options.models}
      products={options.products}
      links={post.links.map((link) => ({
        brandId: link.brandId ?? '',
        instrumentModelId: link.instrumentModelId ?? '',
        productId: link.productId ?? '',
      }))}
    />
  );
}
