import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { getPublishedBlogPosts } from '@/lib/data/blog';
import { BLOG_CATEGORY_LABELS, BLOG_CATEGORIES } from '@/lib/blog-categories';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BlogCategory } from '@/generated/prisma/client';

export const metadata: Metadata = {
  title: 'Knowledge Center',
  description: 'Troubleshooting guides, FAQs, technical articles and instrument guides for analytical lab equipment.',
};

function isBlogCategory(value: string | undefined): value is BlogCategory {
  return BLOG_CATEGORIES.some((category) => category === value);
}

export default async function BlogIndexPage(props: PageProps<'/blog'>) {
  const searchParams = await props.searchParams;
  const rawCategory = typeof searchParams.category === 'string' ? searchParams.category : undefined;
  const category = isBlogCategory(rawCategory) ? rawCategory : undefined;

  const posts = await getPublishedBlogPosts(category);

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Knowledge Center</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Troubleshooting guides, FAQs, technical articles and instrument guides from our engineering team.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link
          href="/blog"
          className={cn(
            'rounded-full border px-3 py-1.5 text-sm',
            !category ? 'border-blue-600 bg-blue-600 text-white' : 'border-border text-muted hover:text-foreground',
          )}
        >
          All
        </Link>
        {BLOG_CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/blog?category=${cat}`}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm',
              category === cat ? 'border-blue-600 bg-blue-600 text-white' : 'border-border text-muted hover:text-foreground',
            )}
          >
            {BLOG_CATEGORY_LABELS[cat]}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <p className="mt-10 text-muted">No articles in this category yet - check back soon.</p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-colors hover:border-blue-500"
            >
              {post.coverImage && (
                <div className="relative h-40 w-full bg-surface-muted">
                  <Image src={post.coverImage} alt="" fill sizes="(min-width: 1024px) 33vw, 50vw" className="object-cover" />
                </div>
              )}
              <div className="flex flex-1 flex-col p-6">
                <span className="text-xs font-medium text-blue-600 dark:text-cyan-400">{BLOG_CATEGORY_LABELS[post.category]}</span>
                <p className="mt-2 font-display text-lg font-semibold text-foreground">{post.title}</p>
                <p className="mt-2 flex-1 text-sm text-muted">{post.excerpt}</p>
                {post.publishedAt && <p className="mt-4 text-xs text-muted">{formatDate(post.publishedAt)}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}
