import { ValidationError } from '@/lib/errors';
import { slugify } from '@/lib/slug';
import type { CurrentSession } from '@/modules/auth/service';
import { recordAudit } from '@/modules/auth/service';
import { findProductById } from './admin-repository';
import { findCategoryById } from './category-repository';
import {
  createOfferingRow,
  findOfferingById,
  findOfferingByProductAndCategory,
  findOfferingBySlugInCategoryAny,
  listOfferingsForProduct,
  listPublicOfferingsForCategory,
  setOfferingActiveRow,
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

/**
 * Único generador/resolver de slug de oferta — reutilizado por
 * `createOffering()` y por el backfill de la Fase 15
 * (`modules/catalog/offering-backfill.ts`), para no duplicar la lógica de
 * colisión en dos lugares.
 */
export async function uniqueOfferingSlugFor(categoryId: string, baseName: string): Promise<string> {
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

export async function createOffering(input: OfferingFormInput, actor: CurrentSession) {
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

  const offering = await createOfferingRow({
    productId: input.productId,
    categoryId: input.categoryId,
    slug,
    ...toRowInput(input),
  });

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'offering.created',
    targetType: 'ProductOffering',
    targetId: offering.id,
    metadata: { productId: offering.productId, categoryId: offering.categoryId },
  });

  return offering;
}

export async function updateOffering(id: string, input: OfferingFormInput, actor: CurrentSession) {
  const existing = await findOfferingById(id);
  if (!existing) {
    throw new ValidationError('La oferta que intentas editar ya no existe.');
  }
  const offering = await updateOfferingRow(id, toRowInput(input));

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'offering.updated',
    targetType: 'ProductOffering',
    targetId: id,
    metadata: { productId: existing.productId, categoryId: existing.categoryId },
  });

  return offering;
}

/**
 * Acción rápida de "activar/desactivar" (task 4.2), independiente del
 * guardado completo del formulario — emite `offering.enabled`/
 * `offering.disabled` (nombres de auditoría exigidos por la spec
 * catalog-administration), a diferencia de `updateOffering`, que siempre
 * registra `offering.updated` aunque el formulario también incluya el
 * campo `active`.
 */
export async function setOfferingActive(id: string, active: boolean, actor: CurrentSession) {
  const existing = await findOfferingById(id);
  if (!existing) {
    throw new ValidationError('La oferta ya no existe.');
  }
  const offering = await setOfferingActiveRow(id, active);

  await recordAudit({
    actorId: actor.adminUser.id,
    action: active ? 'offering.enabled' : 'offering.disabled',
    targetType: 'ProductOffering',
    targetId: id,
    metadata: { productId: existing.productId, categoryId: existing.categoryId },
  });

  return offering;
}

// Sin `actor`/auditoría deliberadamente: la spec catalog-administration
// (lista cerrada — "Category and offering mutations are audit-logged")
// solo exige created/updated/enabled/disabled para ofertas, no una acción
// de eliminación; esta función tampoco está conectada a ninguna pantalla
// admin en la Fase 4 (ver design.md → "Administración": el flujo de la
// Fase 4 es activar/desactivar, no eliminar una oferta).
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
