import Link from 'next/link';
import Image from 'next/image';
import type { KnowledgeArticle } from '@/generated/prisma/client';
import { ARTICLE_KIND_LABELS } from '@/lib/article-kinds';
import { ArticleKind } from '@/generated/prisma/enums';
import { formatDate } from '@/lib/format';

/** Shared between the Knowledge Center index and the homepage preview. */
export function BlogPostCard({ post }: { post: KnowledgeArticle }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-colors hover:border-primary"
    >
      {post.coverImage && (
        <div className="relative h-40 w-full bg-surface-muted">
          <Image src={post.coverImage} alt="" fill sizes="(min-width: 1024px) 33vw, 50vw" className="object-cover" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        <span className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-primary dark:text-secondary">{ARTICLE_KIND_LABELS[post.kind]}</span>
          {post.kind !== ArticleKind.ARTICLE && (
            <span className="rounded-full border border-border px-2 py-0.5 text-muted">
              {ARTICLE_KIND_LABELS[post.kind]}
            </span>
          )}
          {post.errorCode && <span className="font-mono text-muted">{post.errorCode}</span>}
        </span>
        <p className="mt-2 font-display text-lg font-semibold text-foreground">{post.title}</p>
        <p className="mt-2 flex-1 text-sm text-muted">{post.excerpt}</p>
        {post.publishedAt && <p className="mt-4 text-xs text-muted">{formatDate(post.publishedAt)}</p>}
      </div>
    </Link>
  );
}
