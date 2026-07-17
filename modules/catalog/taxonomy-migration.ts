// redesign-extensible-catalog-v2 — corrección de taxonomía (Fase 5): remapea
// una base de datos sembrada bajo el modelo de tres categorías (armazones,
// lentes-opticos, lentes-de-sol-opticos) al modelo definitivo de dos
// (lentes-opticos, lentes-de-sol). Ver design.md → "Migración de datos: dos
// categorías". Idempotente: en una base ya migrada, o en una que nunca tuvo
// las categorías legadas, cada paso es un no-op.
import { prisma } from '@/lib/prisma';

export const LEGACY_FRAMES_SLUG = 'armazones';
export const LEGACY_SUN_SLUG = 'lentes-de-sol-opticos';
export const OPTICAL_SLUG = 'lentes-opticos';
export const DEFINITIVE_SUN_SLUG = 'lentes-de-sol';
const DEFINITIVE_SUN_NAME = 'Lentes de sol';

export interface OfferingConflict {
  productId: string;
  armazonesOfferingId: string;
  lentesOpticosOfferingId: string;
}

export interface TaxonomyMigrationReport {
  /** true solo si esta corrida efectivamente renombró la fila (no si ya estaba renombrada). */
  renamedLentesDeSolOpticos: boolean;
  /** IDs de ProductOffering cuyo categoryId se reasignó de armazones a lentes-opticos en esta corrida. */
  remappedOfferingIds: string[];
  /** Productos con oferta ya existente en ambas categorías legadas — requieren revisión manual admin, nunca fusión automática. */
  conflicts: OfferingConflict[];
  /** true solo si esta corrida eliminó la fila Category de armazones (porque quedó sin ofertas). */
  armazonesCategoryDeleted: boolean;
  /** Ofertas que siguen en armazones al terminar (>0 solo si hay conflictos sin resolver). */
  armazonesCategoryRemainingOfferings: number;
}

/**
 * Ejecuta los pasos 1–3 de "Migración de datos: dos categorías" dentro de
 * una única transacción. Seguro de re-ejecutar: si `armazones` o
 * `lentes-de-sol-opticos` ya no existen, los pasos correspondientes son
 * no-ops y el reporte lo refleja con banderas en `false`/arrays vacíos.
 */
export async function migrateToDefinitiveTaxonomy(): Promise<TaxonomyMigrationReport> {
  return prisma.$transaction(async (tx) => {
    const report: TaxonomyMigrationReport = {
      renamedLentesDeSolOpticos: false,
      remappedOfferingIds: [],
      conflicts: [],
      armazonesCategoryDeleted: false,
      armazonesCategoryRemainingOfferings: 0,
    };

    // Paso 1: renombrar lentes-de-sol-opticos -> lentes-de-sol in-place
    // (mismo id, cero ofertas tocadas). No-op si ya no existe la fila legada
    // o si la fila definitiva ya existe (no se fusionan dos filas vivas aquí).
    const legacySun = await tx.category.findUnique({ where: { slug: LEGACY_SUN_SLUG } });
    if (legacySun) {
      const definitiveSunExists = await tx.category.findUnique({
        where: { slug: DEFINITIVE_SUN_SLUG },
        select: { id: true },
      });
      if (!definitiveSunExists) {
        await tx.category.update({
          where: { id: legacySun.id },
          data: { slug: DEFINITIVE_SUN_SLUG, name: DEFINITIVE_SUN_NAME },
        });
        report.renamedLentesDeSolOpticos = true;
      }
    }

    // Paso 2-3: remapear ofertas de armazones -> lentes-opticos; eliminar
    // armazones solo si queda sin ofertas (reutiliza el mismo criterio de
    // conteo que ya bloquea el borrado manual de una categoría con ofertas
    // — ver category-repository.ts#countCategoryOfferings, sin filtro de
    // deletedAt, para no dejar una categoría "vacía en apariencia" con
    // ofertas soft-deleted todavía apuntándole).
    const armazonesCategory = await tx.category.findUnique({ where: { slug: LEGACY_FRAMES_SLUG } });
    if (armazonesCategory) {
      const opticalCategory = await tx.category.findUnique({ where: { slug: OPTICAL_SLUG } });
      if (!opticalCategory) {
        throw new Error(
          'No se puede remapear la categoría armazones: lentes-opticos no existe todavía. Sembrar categorías antes de migrar.'
        );
      }

      const armazonesOfferings = await tx.productOffering.findMany({
        where: { categoryId: armazonesCategory.id },
      });

      for (const offering of armazonesOfferings) {
        const existingOptical = await tx.productOffering.findUnique({
          where: { productId_categoryId: { productId: offering.productId, categoryId: opticalCategory.id } },
        });
        if (existingOptical) {
          report.conflicts.push({
            productId: offering.productId,
            armazonesOfferingId: offering.id,
            lentesOpticosOfferingId: existingOptical.id,
          });
          continue;
        }
        await tx.productOffering.update({ where: { id: offering.id }, data: { categoryId: opticalCategory.id } });
        report.remappedOfferingIds.push(offering.id);
      }

      const remaining = await tx.productOffering.count({ where: { categoryId: armazonesCategory.id } });
      report.armazonesCategoryRemainingOfferings = remaining;

      if (remaining === 0) {
        await tx.category.delete({ where: { id: armazonesCategory.id } });
        report.armazonesCategoryDeleted = true;
      }
    }

    return report;
  });
}
