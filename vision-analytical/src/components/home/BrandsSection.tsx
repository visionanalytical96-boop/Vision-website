import Link from 'next/link';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from './SectionHeading';
import type { Brand } from '@/generated/prisma/client';
import type { ListSectionContent } from '@/lib/cms/schemas';

export function BrandsSection({ content, brands }: { content: ListSectionContent; brands: Brand[] }) {
  if (brands.length === 0) return null;

  return (
    <section className="py-16 sm:py-20">
      <Container>
        <SectionHeading
          heading={content.heading}
          subheading={content.subheading}
          linkLabel={content.viewAllLabel}
          linkHref={content.viewAllHref}
        />
        <ul className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-5">
          {brands.map((brand) => (
            <li key={brand.id}>
              <Link
                href={`/brands/${brand.slug}`}
                className="flex h-24 items-center justify-center bg-surface px-4 transition-colors hover:bg-surface-muted"
              >
                {brand.logoUrl ? (
                  <Image
                    src={brand.logoUrl}
                    alt={brand.name}
                    width={140}
                    height={40}
                    className="max-h-10 w-auto object-contain"
                  />
                ) : (
                  <span className="text-center font-display text-base font-semibold text-foreground">{brand.name}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
