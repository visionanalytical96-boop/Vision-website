import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogPostForm } from '@/components/forms/BlogPostForm';
import { getAdminBlogPostById, getArticleLinkOptions, getArticleReviewerOptions } from '@/lib/data/admin-blog';
import { getKnowledgeTopics } from '@/lib/data/knowledge-topics';

export const metadata: Metadata = { title: 'Edit Article' };

export default async function EditBlogPostPage(props: PageProps<'/admin/blog/[id]'>) {
  const { id } = await props.params;
  const [post, options, topics, reviewers] = await Promise.all([
    getAdminBlogPostById(id),
    getArticleLinkOptions(),
    getKnowledgeTopics(),
    getArticleReviewerOptions(),
  ]);
  if (!post) notFound();

  return (
    <BlogPostForm
      post={post}
      brands={options.brands}
      models={options.models}
      products={options.products}
      topics={topics}
      reviewers={reviewers}
      tags={post.tags.map((link) => link.tag.name).join(', ')}
      links={post.links.map((link) => ({
        brandId: link.brandId ?? '',
        instrumentModelId: link.instrumentModelId ?? '',
        productId: link.productId ?? '',
      }))}
    />
  );
}
