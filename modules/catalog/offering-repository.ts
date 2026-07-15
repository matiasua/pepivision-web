import { prisma } from '@/lib/prisma';

const IMAGES_ORDERED = { orderBy: { sortOrder: 'asc' as const } };

export function findOfferingById(id: string) {
  return prisma.productOffering.findUnique({ where: { id } });
}

export function findOfferingByProductAndCategory(productId: string, categoryId: string) {
  return prisma.productOffering.findUnique({ where: { productId_categoryId: { productId, categoryId } } });
}

/** Solo para chequeos de unicidad de slug (acotado a la categoría) al crear una oferta. */
export function findOfferingBySlugInCategoryAny(categoryId: string, slug: string) {
  return prisma.productOffering.findUnique({ where: { categoryId_slug: { categoryId, slug } }, select: { id: true } });
}

/** Para la sección admin "Disponibilidad en el catálogo" de un producto (Fase 4) — incluye inactivas/invisibles, excluye soft-deleted. */
export function listOfferingsForProduct(productId: string) {
  return prisma.productOffering.findMany({
    where: { productId, deletedAt: null },
    include: { category: true },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Lectura pública: respeta `category.active/visible`, `offering.active/
 * visible` y excluye soft-deleted — ver spec product-offerings → "Offering
 * active/visible state is independent per category" y "Offerings are
 * soft-deleted, never hard-deleted while referenced".
 */
export function listPublicOfferingsForCategory(categoryId: string) {
  return prisma.productOffering.findMany({
    where: {
      categoryId,
      active: true,
      visible: true,
      deletedAt: null,
      category: { active: true, visible: true },
    },
    include: { product: { include: { colors: true, images: IMAGES_ORDERED, brand: true } } },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

interface OfferingRowInput {
  title: string | null;
  commercialDescription: string | null;
  priceFromClp: number | null;
  active: boolean;
  visible: boolean;
  featured: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
}

export function createOfferingRow(input: OfferingRowInput & { productId: string; categoryId: string; slug: string }) {
  return prisma.productOffering.create({ data: input });
}

/** `productId`/`categoryId`/`slug` deliberadamente fuera de este update — inmutables tras la creación. */
export function updateOfferingRow(id: string, input: OfferingRowInput) {
  return prisma.productOffering.update({ where: { id }, data: input });
}

export function softDeleteOfferingRow(id: string) {
  return prisma.productOffering.update({ where: { id }, data: { deletedAt: new Date() } });
}
