import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogPostForm } from '@/components/forms/BlogPostForm';
import { getAdminBlogPostById } from '@/lib/data/admin-blog';

export const metadata: Metadata = { title: 'Edit Post' };

export default async function EditBlogPostPage(props: PageProps<'/admin/blog/[id]'>) {
  const { id } = await props.params;
  const post = await getAdminBlogPostById(id);
  if (!post) notFound();

  return <BlogPostForm post={post} />;
}
