import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Container } from '@/components/ui/Container';
import { JsonLd } from '@/components/seo/JsonLd';
import { getPublishedBlogPostBySlug } from '@/lib/data/blog';
import { BLOG_CATEGORY_LABELS } from '@/lib/blog-categories';
import { formatDate } from '@/lib/format';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

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

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    url: `${SITE_URL}/blog/${post.slug}`,
    author: { '@type': 'Person', name: post.author.name },
    ...(post.publishedAt ? { datePublished: post.publishedAt.toISOString() } : {}),
    dateModified: post.updatedAt.toISOString(),
    ...(post.coverImage ? { image: `${SITE_URL}${post.coverImage}` } : {}),
  };

  return (
    <Container className="py-12 sm:py-16">
      <JsonLd data={schema} />
      <div className="mx-auto max-w-3xl">
        <Link href="/blog" className="text-sm text-muted hover:text-foreground">
          ← Knowledge Center
        </Link>
        <span className="mt-4 block text-xs font-medium text-primary dark:text-secondary">
          {BLOG_CATEGORY_LABELS[post.category]}
        </span>
        <h1 className="mt-2 font-display text-3xl font-bold text-foreground sm:text-4xl">{post.title}</h1>
        <p className="mt-3 text-sm text-muted">
          {post.author.name}
          {post.publishedAt && ` · ${formatDate(post.publishedAt)}`}
        </p>

        {post.coverImage && (
          <div className="relative mt-6 aspect-video w-full overflow-hidden rounded-2xl bg-surface-muted">
            <Image src={post.coverImage} alt={post.title} fill sizes="(min-width: 1024px) 768px, 100vw" className="object-cover" />
          </div>
        )}

        <div className="prose prose-slate dark:prose-invert mt-8 max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>
      </div>
    </Container>
  );
}
