import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TestimonialForm } from '@/components/forms/TestimonialForm';
import { getTestimonialById } from '@/lib/data/testimonials';

export const metadata: Metadata = { title: 'Edit Testimonial' };

export default async function AdminEditTestimonialPage(props: PageProps<'/admin/website/testimonials/[id]'>) {
  const { id } = await props.params;
  const testimonial = await getTestimonialById(id);
  if (!testimonial) notFound();

  return <TestimonialForm testimonial={testimonial} />;
}
