import type { Metadata } from 'next';
import { TestimonialForm } from '@/components/forms/TestimonialForm';

export const metadata: Metadata = { title: 'Add Testimonial' };

export default function AdminNewTestimonialPage() {
  return <TestimonialForm />;
}
