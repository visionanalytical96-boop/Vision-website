import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { buttonVariants } from '@/components/ui/Button';
import { ConfirmSubmitButton } from '@/components/forms/ConfirmSubmitButton';
import { getAllTestimonials } from '@/lib/data/testimonials';
import { deleteTestimonial, toggleTestimonialPublished } from '@/lib/actions/admin-downloads';

export const metadata: Metadata = { title: 'Testimonials' };

export default async function AdminTestimonialsPage() {
  const testimonials = await getAllTestimonials();

  if (testimonials.length === 0) {
    return (
      <EmptyState
        title="No testimonials yet"
        description="The homepage testimonials section stays hidden until at least one is published."
        actionLabel="Add Testimonial"
        actionHref="/admin/website/testimonials/new"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/admin/website/testimonials/new" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
          <Plus className="h-4 w-4" />
          Add Testimonial
        </Link>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Quote</TableHeaderCell>
            <TableHeaderCell>Person</TableHeaderCell>
            <TableHeaderCell>Company</TableHeaderCell>
            <TableHeaderCell>Published</TableHeaderCell>
            <TableHeaderCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {testimonials.map((testimonial) => (
            <TableRow key={testimonial.id}>
              <TableCell className="max-w-md">
                <span className="line-clamp-2">{testimonial.quote}</span>
              </TableCell>
              <TableCell>{testimonial.authorName}</TableCell>
              <TableCell>{testimonial.company ?? '—'}</TableCell>
              <TableCell>
                <form action={toggleTestimonialPublished}>
                  <input type="hidden" name="id" value={testimonial.id} />
                  <button type="submit" className="text-xs">
                    {testimonial.isPublished ? (
                      <span className="text-success">Published</span>
                    ) : (
                      <span className="text-muted">Draft</span>
                    )}
                  </button>
                </form>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/website/testimonials/${testimonial.id}`}
                    className="text-primary hover:underline dark:text-secondary"
                    aria-label={`Edit testimonial from ${testimonial.authorName}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <form action={deleteTestimonial}>
                    <input type="hidden" name="id" value={testimonial.id} />
                    <ConfirmSubmitButton
                      confirmMessage={`Delete the testimonial from ${testimonial.authorName}? This cannot be undone.`}
                      className="text-xs text-danger hover:underline"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
