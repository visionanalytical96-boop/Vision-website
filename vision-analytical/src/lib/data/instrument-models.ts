import 'server-only';
import { prisma } from '@/lib/db';

/** Models grouped under their brand, for the parts finder and admin pickers. */
export function getPublishedInstrumentModels() {
  return prisma.instrumentModel.findMany({
    where: { isPublished: true },
    include: { brand: true, category: true },
    orderBy: [{ brand: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export function getInstrumentModelsForBrand(brandSlug: string) {
  return prisma.instrumentModel.findMany({
    where: { isPublished: true, brand: { slug: brandSlug } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

/** Resolved from the `model` query parameter, which carries "brand/model". */
export function getInstrumentModelByPath(brandSlug: string, modelSlug: string) {
  return prisma.instrumentModel.findFirst({
    where: { slug: modelSlug, isPublished: true, brand: { slug: brandSlug } },
    include: { brand: true, category: true },
  });
}

/** Admin list - includes unpublished. */
export function getAllInstrumentModels() {
  return prisma.instrumentModel.findMany({
    include: { brand: true, category: true, _count: { select: { compatibility: true } } },
    orderBy: [{ brand: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export function getInstrumentModelById(id: string) {
  return prisma.instrumentModel.findUnique({ where: { id } });
}
