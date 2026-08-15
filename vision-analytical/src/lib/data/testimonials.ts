import 'server-only';
import { prisma } from '@/lib/db';

/** Testimonials for the public site. Empty until an admin adds real ones. */
export function getPublishedTestimonials(limit?: number) {
  return prisma.testimonial.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    ...(limit ? { take: limit } : {}),
  });
}

/** Admin list - includes unpublished. */
export function getAllTestimonials() {
  return prisma.testimonial.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] });
}

export function getTestimonialById(id: string) {
  return prisma.testimonial.findUnique({ where: { id } });
}
