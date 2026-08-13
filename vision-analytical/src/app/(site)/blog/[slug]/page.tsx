import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Container } from '@/components/ui/Container';
import { JsonLd } from '@/components/seo/JsonLd';
import { getKnowledgeArticleBySlug, recordArticleView } from '@/lib/data/knowledge';
import { ArticleLinks } from '@/components/blog/ArticleLinks';
import { ARTICLE_KIND_LABELS } from '@/lib/article-kinds';
import { ArticleKind } from '@/generated/prisma/enums';
import { formatDate } from '@/lib/format';
import { requireFeature } from '@/lib/data/features';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export async function generateMetadata(props: PageProps<'/blog/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const post = await getKnowledgeArticleBySlug(slug);
  if (!post) return {};
  return { title: post.seoTitle ?? post.title, description: post.seoDescription ?? post.excerpt };
}

export default async function BlogPostPage(props: PageProps<'/blog/[slug]'>) {
  await requireFeature('knowledge_center');
  const { slug } = await props.params;
  const post = await getKnowledgeArticleBySlug(slug);
  if (!post) notFound();

  // Fire-and-forget: a reader should never wait on analytics.
  void recordArticleView(post.id);

  const schema = {
    '@context': 'https://schema.org',
    '@type': post.kind === ArticleKind.FAQ ? 'FAQPage' : 'TechArticle',
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
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-primary dark:text-secondary">{ARTICLE_KIND_LABELS[post.kind]}</span>
          {post.kind !== ArticleKind.ARTICLE && (
            <span className="rounded-full border border-border px-2 py-0.5 text-muted">
              {ARTICLE_KIND_LABELS[post.kind]}
            </span>
          )}
        </div>
        {post.errorCode && (
          <p className="mt-3 inline-flex rounded-lg border border-border bg-surface-muted px-3 py-1.5 font-mono text-sm text-foreground">
            {post.errorCode}
          </p>
        )}
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

        {post.videoUrl && (
          <div className="relative mt-6 aspect-video w-full overflow-hidden rounded-2xl border border-border bg-surface-muted">
            <iframe
              src={post.videoUrl}
              title={post.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>
        )}

        <div className="prose prose-slate dark:prose-invert mt-8 max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>

        <ArticleLinks links={post.links} />
      </div>
    </Container>
  );
}
