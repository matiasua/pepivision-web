import { ValidationError } from '@/lib/errors';
import { slugify } from '@/lib/slug';
import { findProductById } from './admin-repository';
import { findCategoryById } from './category-repository';
import {
  createOfferingRow,
  findOfferingById,
  findOfferingByProductAndCategory,
  findOfferingBySlugInCategoryAny,
  listOfferingsForProduct,
  listPublicOfferingsForCategory,
  softDeleteOfferingRow,
  updateOfferingRow,
} from './offering-repository';
import type { OfferingFormInput } from './offering-schemas';

export function getOffering(id: string) {
  return findOfferingById(id);
}

export function listOfferingsForProductAdmin(productId: string) {
  return listOfferingsForProduct(productId);
}

/** Público, ya filtrado por category/offering active+visible — ver offering-repository.ts. */
export function listVisibleOfferingsForCategory(categoryId: string) {
  return listPublicOfferingsForCategory(categoryId);
}

async function uniqueOfferingSlugFor(categoryId: string, baseName: string): Promise<string> {
  const base = slugify(baseName);
  let candidate = base;
  let suffix = 2;
  while (await findOfferingBySlugInCategoryAny(categoryId, candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function toRowInput(input: OfferingFormInput) {
  return {
    title: input.title ?? null,
    commercialDescription: input.commercialDescription ?? null,
    priceFromClp: input.priceFromClp ?? null,
    active: input.active,
    visible: input.visible,
    featured: input.featured,
    sortOrder: input.sortOrder,
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
  };
}

export async function createOffering(input: OfferingFormInput) {
  const product = await findProductById(input.productId);
  if (!product) {
    throw new ValidationError('El producto seleccionado ya no existe.');
  }
  const category = await findCategoryById(input.categoryId);
  if (!category) {
    throw new ValidationError('La categoría seleccionada ya no existe.');
  }
  // Chequeo a nivel de servicio antes de depender solo de la restricción
  // @@unique([productId, categoryId]) de BD — mismo mensaje amigable que
  // el resto del panel admin, en vez de dejar burbujear un error crudo de
  // Prisma (P2002).
  const existingOffering = await findOfferingByProductAndCategory(input.productId, input.categoryId);
  if (existingOffering) {
    throw new ValidationError('Este producto ya tiene una oferta en esta categoría.');
  }

  // slug = product.slug (acotado a la categoría) — preserva la URL actual
  // del producto cuando se convierte en su primera oferta (ver design.md
  // → "Migración de datos"); un suffix numérico solo entra en juego si dos
  // productos DISTINTOS slugifican igual dentro de la misma categoría.
  const slug = await uniqueOfferingSlugFor(input.categoryId, product.slug);

  return createOfferingRow({
    productId: input.productId,
    categoryId: input.categoryId,
    slug,
    ...toRowInput(input),
  });
}

export async function updateOffering(id: string, input: OfferingFormInput) {
  const existing = await findOfferingById(id);
  if (!existing) {
    throw new ValidationError('La oferta que intentas editar ya no existe.');
  }
  return updateOfferingRow(id, toRowInput(input));
}

export async function softDeleteOffering(id: string) {
  const existing = await findOfferingById(id);
  if (!existing) {
    throw new ValidationError('La oferta ya no existe.');
  }
  return softDeleteOfferingRow(id);
}

/**
 * 3.2 — Verifica que una oferta referenciada por id realmente pertenezca a
 * la categoría y producto reclamados por el llamador, antes de cualquier
 * mutación relacionada (valores de atributos por categoría, envío de
 * cotización, etc.) — ver spec product-offerings → "Offering ownership is
 * validated server-side before every mutation". Nunca confía en que un id
 * de oferta enviado por el cliente ya pertenece a lo que dice pertenecer;
 * mismo criterio que `assertColorBelongsToProduct` en admin-service.ts ya
 * aplica a ProductColor.
 */
export async function verifyOfferingOwnership(offeringId: string, categoryId: string, productId: string) {
  const offering = await findOfferingById(offeringId);
  if (!offering || offering.categoryId !== categoryId || offering.productId !== productId) {
    throw new ValidationError('La oferta no pertenece a la categoría o producto indicados.');
  }
  return offering;
}
