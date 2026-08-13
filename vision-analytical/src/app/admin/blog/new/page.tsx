import type { Metadata } from 'next';
import { BlogPostForm } from '@/components/forms/BlogPostForm';
import { getArticleLinkOptions, getArticleReviewerOptions } from '@/lib/data/admin-blog';
import { getKnowledgeTopics } from '@/lib/data/knowledge-topics';

export const metadata: Metadata = { title: 'New Article' };

export default async function NewBlogPostPage() {
  const [{ brands, models, products }, topics, reviewers] = await Promise.all([
    getArticleLinkOptions(),
    getKnowledgeTopics(),
    getArticleReviewerOptions(),
  ]);

  return (
    <BlogPostForm brands={brands} models={models} products={products} topics={topics} reviewers={reviewers} />
  );
}
