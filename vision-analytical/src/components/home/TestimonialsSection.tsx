import Image from 'next/image';
import { Quote } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from './SectionHeading';
import type { Testimonial } from '@/generated/prisma/client';
import type { ListSectionContent } from '@/lib/cms/schemas';

export function TestimonialsSection({
  content,
  testimonials,
}: {
  content: ListSectionContent;
  testimonials: Testimonial[];
}) {
  // Nothing is seeded here on purpose: a testimonial is a real customer's
  // words, so the section stays hidden until an admin adds actual ones.
  if (testimonials.length === 0) return null;

  return (
    <section className="bg-surface-muted py-16 sm:py-20">
      <Container>
        <SectionHeading
          heading={content.heading}
          subheading={content.subheading}
          linkLabel={content.viewAllLabel}
          linkHref={content.viewAllHref}
        />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <li key={testimonial.id}>
              <figure className="flex h-full flex-col rounded-xl border border-border bg-surface p-6">
                <Quote className="h-5 w-5 flex-none text-primary dark:text-secondary" aria-hidden />
                <blockquote className="mt-4 flex-1 text-foreground">{testimonial.quote}</blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-5">
                  {testimonial.logoUrl ? (
                    <Image
                      src={testimonial.logoUrl}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 flex-none rounded-lg object-contain"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{testimonial.authorName}</p>
                    <p className="truncate text-xs text-muted">
                      {[testimonial.authorTitle, testimonial.company].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
