// Fase 15 (redesign-extensible-catalog-v2 — migración, backfill y corte
// definitivo): backfill explícito y manual (nunca invocado desde un
// request público, nunca en el arranque de la app, nunca en el seed
// normal) que crea una `ProductOffering` en Lentes ópticos para cada
// `Product` visible que todavía no tiene ninguna oferta — el punto 1 de
// design.md → "Fase de compatibilidad de precios", que tasks.md 15.1
// nunca capturó como tarea explícita (ver 15.8, agregada en el cierre de
// esta fase).
//
// Destino único y no inferido: la categoría canónica `lentes-opticos` —
// nunca `lentes-de-sol` por nombre/imagen/precio/keywords, per design.md
// (el modelo no tiene señal alguna para inferir modalidad solar desde un
// Product V1 puro).
import { prisma } from '@/lib/prisma';
import { OPTICAL_SLUG } from './taxonomy-migration';

export const BACKFILL_TARGET_CATEGORY_SLUG = OPTICAL_SLUG;

export interface BackfillCandidate {
  productId: string;
  productCode: string;
  /**
   * = `product.slug` exactamente — nunca re-slugificado desde el nombre.
   * `Product.slug` ya es único globalmente (constraint de BD), así que
   * una colisión entre dos candidatos de esta misma corrida es
   * estructuralmente imposible; el único caso posible es contra una
   * oferta pre-existente en la categoría destino, verificado explícitamente
   * antes de crear (ver `executeProductOfferingBackfill`).
   */
  plannedSlug: string;
  priceFromClp: number;
  plannedSortOrder: number;
}

export interface BackfillDataConflict {
  productId: string;
  productCode: string;
  reason: string;
}

export interface BackfillSlugConflict {
  productId: string;
  productCode: string;
  slug: string;
  conflictingOfferingId: string;
}

export interface BackfillPlan {
  categorySlug: string;
  categoryFound: boolean;
  productsExamined: number;
  candidates: BackfillCandidate[];
  existingOfferingsPreserved: number;
  dataConflicts: BackfillDataConflict[];
  slugConflicts: BackfillSlugConflict[];
  /** offerings totales hoy + candidatos sin conflicto — el resultado esperado si se escribe. */
  totalOfferingsAfterWrite: number;
}

/**
 * Selecciona exclusivamente `Product` visibles, no eliminados (el modelo
 * no tiene soft-delete propio, solo `visible`), sin ninguna
 * `ProductOffering` todavía — nunca toca un producto que ya tiene una
 * oferta, sin importar en qué categoría esté.
 */
async function findCandidateProducts() {
  return prisma.product.findMany({
    where: { visible: true, offerings: { none: {} } },
    orderBy: { code: 'asc' },
    select: { id: true, code: true, slug: true, name: true, priceFromClp: true },
  });
}

/**
 * Plan de solo lectura (dry-run) — nunca escribe. Mismo criterio de
 * selección que `executeProductOfferingBackfill` usará dentro de la
 * transacción, para que el plan reportado coincida exactamente con lo
 * que se ejecutaría.
 */
export async function planProductOfferingBackfill(): Promise<BackfillPlan> {
  const category = await prisma.category.findUnique({ where: { slug: BACKFILL_TARGET_CATEGORY_SLUG }, select: { id: true } });
  const candidateProducts = await findCandidateProducts();
  const existingOfferingsPreserved = await prisma.productOffering.count();
  const currentMaxSortOrder = category
    ? ((await prisma.productOffering.aggregate({ where: { categoryId: category.id }, _max: { sortOrder: true } }))._max
        .sortOrder ?? -1)
    : -1;

  const candidates: BackfillCandidate[] = [];
  const dataConflicts: BackfillDataConflict[] = [];
  const slugConflicts: BackfillSlugConflict[] = [];

  let nextSortOrder = currentMaxSortOrder + 1;
  for (const product of candidateProducts) {
    if (!Number.isInteger(product.priceFromClp) || product.priceFromClp < 0) {
      // Defensivo: Product.priceFromClp es NOT NULL/positive a nivel de
      // schema/Zod, así que esto nunca debería ocurrir con datos reales —
      // pero el backfill nunca fabrica un precio, así que un valor
      // inválido se reporta como conflicto en vez de forzar 0.
      dataConflicts.push({
        productId: product.id,
        productCode: product.code,
        reason: 'Product.priceFromClp inválido o ausente — no se puede copiar un precio inicial válido.',
      });
      continue;
    }

    if (category) {
      const existingAtSlug = await prisma.productOffering.findUnique({
        where: { categoryId_slug: { categoryId: category.id, slug: product.slug } },
        select: { id: true },
      });
      if (existingAtSlug) {
        slugConflicts.push({
          productId: product.id,
          productCode: product.code,
          slug: product.slug,
          conflictingOfferingId: existingAtSlug.id,
        });
        continue;
      }
    }

    candidates.push({
      productId: product.id,
      productCode: product.code,
      plannedSlug: product.slug,
      priceFromClp: product.priceFromClp,
      plannedSortOrder: nextSortOrder,
    });
    nextSortOrder += 1;
  }

  return {
    categorySlug: BACKFILL_TARGET_CATEGORY_SLUG,
    categoryFound: category !== null,
    productsExamined: candidateProducts.length,
    candidates,
    existingOfferingsPreserved,
    dataConflicts,
    slugConflicts,
    totalOfferingsAfterWrite: existingOfferingsPreserved + candidates.length,
  };
}

export interface BackfillWriteResult {
  createdOfferingIds: string[];
  createdCount: number;
}

/**
 * Fase de escritura — una única transacción Prisma para todo el lote:
 * 1) vuelve a resolver la categoría, 2) vuelve a leer candidatos,
 * 3) confirma que siguen sin oferta, 4) vuelve a comprobar colisión de
 * slug, 5) crea únicamente las que faltan (`create` uno por uno — nunca
 * `upsert`/`createMany`, para poder abortar ante el primer error real),
 * 6) si algo no coincide con el plan ya validado, aborta la transacción
 * completa — nunca deja resultados parciales. Nunca actualiza una
 * `ProductOffering` existente, nunca toca `Product.priceFromClp`.
 */
export async function executeProductOfferingBackfill(): Promise<BackfillWriteResult> {
  return prisma.$transaction(async (tx) => {
    const category = await tx.category.findUnique({ where: { slug: BACKFILL_TARGET_CATEGORY_SLUG }, select: { id: true } });
    if (!category) {
      throw new Error(`La categoría canónica "${BACKFILL_TARGET_CATEGORY_SLUG}" no existe — ejecuta el seed antes de escribir.`);
    }

    const candidateProducts = await tx.product.findMany({
      where: { visible: true, offerings: { none: {} } },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, slug: true, priceFromClp: true },
    });

    const maxSortOrderRow = await tx.productOffering.aggregate({
      where: { categoryId: category.id },
      _max: { sortOrder: true },
    });
    let nextSortOrder = (maxSortOrderRow._max.sortOrder ?? -1) + 1;

    const createdOfferingIds: string[] = [];
    for (const product of candidateProducts) {
      if (!Number.isInteger(product.priceFromClp) || product.priceFromClp < 0) {
        throw new Error(
          `Conflicto inesperado durante la escritura: Product ${product.code} tiene priceFromClp inválido. Abortando todo el lote.`
        );
      }

      const stillNoOffering = await tx.productOffering.count({ where: { productId: product.id } });
      if (stillNoOffering > 0) {
        // Otro proceso creó una oferta para este producto entre el dry-run
        // y esta escritura — nunca se crea una segunda oferta para el
        // mismo producto en la misma categoría; se aborta todo el lote en
        // vez de continuar con un plan que ya no es válido.
        throw new Error(`Conflicto inesperado: Product ${product.code} ya tiene una oferta — el plan quedó obsoleto. Abortando todo el lote.`);
      }

      const existingAtSlug = await tx.productOffering.findUnique({
        where: { categoryId_slug: { categoryId: category.id, slug: product.slug } },
        select: { id: true },
      });
      if (existingAtSlug) {
        throw new Error(
          `Conflicto inesperado: el slug "${product.slug}" ya está en uso en ${BACKFILL_TARGET_CATEGORY_SLUG} por otra oferta. Abortando todo el lote.`
        );
      }

      const created = await tx.productOffering.create({
        data: {
          productId: product.id,
          categoryId: category.id,
          slug: product.slug,
          title: null,
          commercialDescription: null,
          priceFromClp: product.priceFromClp,
          active: true,
          visible: true,
          featured: false,
          sortOrder: nextSortOrder,
          configuration: undefined,
          seoTitle: null,
          seoDescription: null,
        },
      });
      createdOfferingIds.push(created.id);
      nextSortOrder += 1;
    }

    return { createdOfferingIds, createdCount: createdOfferingIds.length };
  });
}
