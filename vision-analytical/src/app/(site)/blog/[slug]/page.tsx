import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Container } from '@/components/ui/Container';
import { getPublishedBlogPostBySlug } from '@/lib/data/blog';
import { BLOG_CATEGORY_LABELS } from '@/lib/blog-categories';
import { formatDate } from '@/lib/format';

export async function generateMetadata(props: PageProps<'/blog/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) return {};
  return { title: post.seoTitle ?? post.title, description: post.seoDescription ?? post.excerpt };
}

export default async function BlogPostPage(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) notFound();

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/blog" className="text-sm text-muted hover:text-foreground">
          ← Knowledge Center
        </Link>
        <span className="mt-4 block text-xs font-medium text-blue-600 dark:text-cyan-400">
          {BLOG_CATEGORY_LABELS[post.category]}
        </span>
        <h1 className="mt-2 font-display text-3xl font-bold text-foreground sm:text-4xl">{post.title}</h1>
        <p className="mt-3 text-sm text-muted">
          {post.author.name}
          {post.publishedAt && ` · ${formatDate(post.publishedAt)}`}
        </p>

        <div className="prose prose-slate dark:prose-invert mt-8 max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>
      </div>
    </Container>
  );
}
