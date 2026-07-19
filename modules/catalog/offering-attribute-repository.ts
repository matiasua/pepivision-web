import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** Todas las filas de valor de una oferta — nunca filtra por `attributeDefinition.active`/`filterable`: eso es una decisión del lector (fail-closed en el catálogo público, sin filtrar en el editor admin, que debe poder mostrar/limpiar un valor huérfano de una definición ya desactivada). */
export function listAttributeValuesForOffering(offeringId: string) {
  return prisma.productOfferingAttributeValue.findMany({ where: { offeringId } });
}

/** Definiciones de una categoría, sin importar `active`/`filterable` — el editor admin debe poder mostrar (y limpiar) un valor de una definición ya desactivada, no solo las vigentes. */
export function listAttributeDefinitionsForCategory(categoryId: string) {
  return prisma.categoryAttributeDefinition.findMany({
    where: { categoryId },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
  });
}

export interface AttributeValueWrite {
  offeringId: string;
  attributeDefinitionId: string;
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
}

/**
 * Reemplaza atómicamente el conjunto de valores de una oferta: una
 * escritura por definición ya resuelta/validada por el servicio (`writes`
 * = upserts; `deletes` = definiciones cuyo valor se retiró
 * explícitamente). Una sola transacción — si cualquier operación falla,
 * ninguna se aplica (ver "Transacción y consistencia").
 */
export function replaceOfferingAttributeValues(offeringId: string, writes: AttributeValueWrite[], deleteAttributeDefinitionIds: string[]) {
  return prisma.$transaction(async (tx) => {
    if (deleteAttributeDefinitionIds.length > 0) {
      await tx.productOfferingAttributeValue.deleteMany({
        where: { offeringId, attributeDefinitionId: { in: deleteAttributeDefinitionIds } },
      });
    }
    for (const write of writes) {
      const data: Prisma.ProductOfferingAttributeValueUncheckedCreateInput = {
        offeringId: write.offeringId,
        attributeDefinitionId: write.attributeDefinitionId,
        valueText: write.valueText,
        valueNumber: write.valueNumber,
        valueBoolean: write.valueBoolean,
      };
      await tx.productOfferingAttributeValue.upsert({
        where: { offeringId_attributeDefinitionId: { offeringId, attributeDefinitionId: write.attributeDefinitionId } },
        create: data,
        update: {
          valueText: write.valueText,
          valueNumber: write.valueNumber,
          valueBoolean: write.valueBoolean,
        },
      });
    }
    return tx.productOfferingAttributeValue.findMany({ where: { offeringId } });
  });
}
