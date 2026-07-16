import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export function listCategoriesForAdmin() {
  return prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
}

/** Para el selector público de categorías (`/catalogo`) y cualquier lectura pública — nunca hardcoded en JSX. */
export function listActiveVisibleCategories() {
  return prisma.category.findMany({
    where: { active: true, visible: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

/** Resolución pública de `/catalogo/[categorySlug]` — una categoría inactiva u oculta no resuelve (404), igual que un producto con `visible:false`. */
export function findActiveVisibleCategoryBySlug(slug: string) {
  return prisma.category.findFirst({ where: { slug, active: true, visible: true } });
}

/**
 * Para el selector de categorías del formulario admin de producto
 * ("Disponibilidad en el catálogo") — a diferencia de
 * listActiveVisibleCategories(), ignora `visible` (una categoría oculta al
 * público pero activa igual debe poder configurarse desde el admin).
 */
export function listActiveCategoriesForAdmin() {
  return prisma.category.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
}

export function findCategoryById(id: string) {
  return prisma.category.findUnique({ where: { id } });
}

/** Ignora active/visible — solo para chequeos de unicidad de slug al crear/editar. */
export function findCategoryBySlugAny(slug: string) {
  return prisma.category.findUnique({ where: { slug }, select: { id: true } });
}

export function findCategoryBySlug(slug: string) {
  return prisma.category.findUnique({ where: { slug } });
}

interface CategoryRowInput {
  name: string;
  shortDescription: string | null;
  description: string | null;
  active: boolean;
  visible: boolean;
  sortOrder: number;
  icon: string | null;
  imagePath: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  capabilities: Prisma.InputJsonValue;
}

export function createCategoryRow(input: CategoryRowInput & { slug: string }) {
  return prisma.category.create({ data: input });
}

/**
 * `slug` deliberadamente no forma parte de este update — inmutable tras la
 * creación, mismo criterio de estabilidad de URL que `updateProductRow`
 * aplica a `Product.slug`.
 */
export function updateCategoryRow(id: string, input: CategoryRowInput) {
  return prisma.category.update({ where: { id }, data: input });
}

export function deleteCategoryRow(id: string) {
  return prisma.category.delete({ where: { id } });
}

/** Usado para bloquear el borrado de una categoría con ofertas asociadas — ver design.md → "Administración". */
export function countCategoryOfferings(categoryId: string) {
  return prisma.productOffering.count({ where: { categoryId } });
}

export function setCategoryActiveRow(id: string, active: boolean) {
  return prisma.category.update({ where: { id }, data: { active } });
}

export function runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(fn);
}

/** Mismo patrón que reorderProductImagesRows en modules/catalog/admin-repository.ts. */
export function reorderCategoryRows(tx: Prisma.TransactionClient, orderedIds: string[]) {
  return Promise.all(orderedIds.map((id, index) => tx.category.update({ where: { id }, data: { sortOrder: index } })));
}
