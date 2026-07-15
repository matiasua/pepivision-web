import { ValidationError } from '@/lib/errors';
import { slugify } from '@/lib/slug';
import { validateCategoryCapabilities } from './category-capabilities';
import {
  countCategoryOfferings,
  createCategoryRow,
  deleteCategoryRow,
  findCategoryById,
  findCategoryBySlugAny,
  listActiveVisibleCategories,
  listCategoriesForAdmin,
  updateCategoryRow,
} from './category-repository';
import type { CategoryFormInput } from './category-schemas';

// Nota de alcance (Fase 2 de redesign-extensible-catalog-v2): estas
// funciones todavía no reciben un `actor: CurrentSession` ni llaman a
// recordAudit() — eso llega en la Fase 4 (tarea 4.4), junto con el propio
// `/admin/categories` que es quien primero las invoca con un actor real.
// El patrón (CRUD + auditoría inmediata) es el mismo que
// modules/catalog/admin-service.ts ya usa para Product.

export function listCategories() {
  return listCategoriesForAdmin();
}

export function listActiveCategories() {
  return listActiveVisibleCategories();
}

export function getCategory(id: string) {
  return findCategoryById(id);
}

async function uniqueCategorySlugFor(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 2;
  while (await findCategoryBySlugAny(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function toRowInput(input: CategoryFormInput) {
  return {
    name: input.name,
    shortDescription: input.shortDescription ?? null,
    description: input.description ?? null,
    active: input.active,
    visible: input.visible,
    sortOrder: input.sortOrder,
    icon: input.icon ?? null,
    imagePath: input.imagePath ?? null,
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
    capabilities: validateCategoryCapabilities(input.capabilities),
  };
}

export async function createCategory(input: CategoryFormInput) {
  const slug = await uniqueCategorySlugFor(input.name);
  return createCategoryRow({ ...toRowInput(input), slug });
}

export async function updateCategory(id: string, input: CategoryFormInput) {
  const existing = await findCategoryById(id);
  if (!existing) {
    throw new ValidationError('La categoría que intentas editar ya no existe.');
  }
  return updateCategoryRow(id, toRowInput(input));
}

// Borrado físico autorizado explícitamente cuando offeringCount === 0 — no
// es una conveniencia técnica: la spec (catalog-categories → "Categories
// with offerings cannot be silently deleted") condiciona el bloqueo a "una
// categoría CON ofertas asociadas"; design.md → "Administración" describe
// el mismo `{status:'blocked', offeringCount}` mirroring
// removeProductColor(), que también borra físicamente cuando su condición
// de bloqueo (fotos asociadas) no aplica. "Preferir desactivación" es la
// recomendación de UX de la futura pantalla admin (Fase 4), no una
// restricción que prohíba el borrado sin ofertas.
export type RemoveCategoryResult = { status: 'removed' } | { status: 'blocked'; offeringCount: number };

export async function deleteCategory(id: string): Promise<RemoveCategoryResult> {
  const existing = await findCategoryById(id);
  if (!existing) {
    throw new ValidationError('La categoría ya no existe.');
  }

  const offeringCount = await countCategoryOfferings(id);
  if (offeringCount > 0) {
    return { status: 'blocked', offeringCount };
  }

  await deleteCategoryRow(id);
  return { status: 'removed' };
}
