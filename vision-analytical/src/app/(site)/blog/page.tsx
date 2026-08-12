import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, TriangleAlert } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { BlogPostCard } from '@/components/blog/BlogPostCard';
import { getKnowledgeArticles, getKnowledgeKindCounts, getPopularArticles } from '@/lib/data/knowledge';
import { BLOG_CATEGORY_LABELS, BLOG_CATEGORIES } from '@/lib/blog-categories';
import { ARTICLE_KINDS, ARTICLE_KIND_PLURALS, isArticleKind } from '@/lib/article-kinds';
import { cn } from '@/lib/utils';
import type { BlogCategory } from '@/generated/prisma/client';
import { requireFeature } from '@/lib/data/features';

export const metadata: Metadata = {
  title: 'Knowledge Center',
  description:
    'Troubleshooting guides, FAQs, error-code explanations, technical articles, case studies and instrument guides for analytical lab equipment.',
};

function isBlogCategory(value: string | undefined): value is BlogCategory {
  return BLOG_CATEGORIES.some((category) => category === value);
}

function chipClass(active: boolean) {
  return cn(
    'rounded-full border px-3 py-1.5 text-sm',
    active ? 'border-primary bg-primary text-white' : 'border-border text-muted hover:text-foreground',
  );
}

export default async function BlogIndexPage(props: PageProps<'/blog'>) {
  await requireFeature('knowledge_center');
  const searchParams = await props.searchParams;
  const rawCategory = typeof searchParams.category === 'string' ? searchParams.category : undefined;
  const category = isBlogCategory(rawCategory) ? rawCategory : undefined;
  const rawKind = typeof searchParams.kind === 'string' ? searchParams.kind : undefined;
  const kind = isArticleKind(rawKind) ? rawKind : undefined;
  const query = typeof searchParams.q === 'string' ? searchParams.q : undefined;

  const filters = { category, kind, query };
  const [posts, kindCounts, popular] = await Promise.all([
    getKnowledgeArticles(filters),
    getKnowledgeKindCounts(filters),
    getPopularArticles(5),
  ]);

  function buildHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const current: Record<string, string | undefined> = { q: query, category, kind, ...overrides };
    for (const [key, value] of Object.entries(current)) {
      if (value) params.set(key, value);
    }
    const queryString = params.toString();
    return queryString ? `/blog?${queryString}` : '/blog';
  }

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Knowledge Center</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Troubleshooting notes, error-code explanations, FAQs and instrument guides written by our engineering team.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-[minmax(0,28rem)_auto] sm:items-center">
        <form method="GET" role="search">
          {category && <input type="hidden" name="category" value={category} />}
          {kind && <input type="hidden" name="kind" value={kind} />}
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input name="q" defaultValue={query} placeholder="Search the knowledge base…" className="pl-9" />
          </div>
        </form>
        <Link
          href="/error-codes"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline dark:text-secondary"
        >
          <TriangleAlert className="h-4 w-4" />
          Look up an error code
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Link href={buildHref({ kind: undefined })} className={chipClass(!kind)}>
            All types
          </Link>
          {ARTICLE_KINDS.map((value) => {
            const count = kindCounts.get(value) ?? 0;
            if (count === 0 && kind !== value) return null;
            return (
              <Link key={value} href={buildHref({ kind: value })} className={chipClass(kind === value)}>
                {ARTICLE_KIND_PLURALS[value]} ({count})
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={buildHref({ category: undefined })} className={chipClass(!category)}>
            All topics
          </Link>
          {BLOG_CATEGORIES.map((value) => (
            <Link key={value} href={buildHref({ category: value })} className={chipClass(category === value)}>
              {BLOG_CATEGORY_LABELS[value]}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div>
          {posts.length === 0 ? (
            <EmptyState
              title={query ? `Nothing found for “${query}”` : 'No articles here yet'}
              description="Can't find what you need? Ask our engineers — we answer, and often turn the answer into an article."
              actionLabel="Ask a question"
              actionHref="/contact"
            />
          ) : (
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {posts.map((post) => (
                <li key={post.id}>
                  <BlogPostCard post={post} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {popular.length > 0 && (
          <aside>
            <h2 className="font-display text-base font-semibold text-foreground">Most read</h2>
            <ul className="mt-3 space-y-3">
              {popular.map((post) => (
                <li key={post.id}>
                  <Link href={`/blog/${post.slug}`} className="text-sm text-muted hover:text-primary">
                    {post.title}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </Container>
  );
}
