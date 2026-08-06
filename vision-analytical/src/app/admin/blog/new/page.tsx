import type { Metadata } from 'next';
import { BlogPostForm } from '@/components/forms/BlogPostForm';

export const metadata: Metadata = { title: 'New Post' };

export default function NewBlogPostPage() {
  return <BlogPostForm />;
}
