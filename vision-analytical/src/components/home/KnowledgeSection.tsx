import { Container } from '@/components/ui/Container';
import { BlogPostCard } from '@/components/blog/BlogPostCard';
import { SectionHeading } from './SectionHeading';
import type { KnowledgeArticle } from '@/generated/prisma/client';
import type { ListSectionContent } from '@/lib/cms/schemas';

export function KnowledgeSection({ content, posts }: { content: ListSectionContent; posts: KnowledgeArticle[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="py-16 sm:py-20">
      <Container>
        <SectionHeading
          heading={content.heading}
          subheading={content.subheading}
          linkLabel={content.viewAllLabel}
          linkHref={content.viewAllHref}
        />
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.id}>
              <BlogPostCard post={post} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
