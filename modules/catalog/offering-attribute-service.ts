import { CategoryAttributeType } from '@prisma/client';
import { ValidationError } from '@/lib/errors';
import type { CurrentSession } from '@/modules/auth/service';
import { recordAudit } from '@/modules/auth/service';
import { findOfferingById } from './offering-repository';
import {
  listAttributeDefinitionsForCategory,
  listAttributeValuesForOffering,
  replaceOfferingAttributeValues,
  type AttributeValueWrite,
} from './offering-attribute-repository';
import { parseAttributeOptionsList } from './dynamic-filters';
import type { OfferingAttributeValueInput, UpdateOfferingAttributeValuesInput } from './offering-attribute-schemas';

export interface OfferingAttributeDefinitionView {
  id: string;
  key: string;
  label: string;
  type: CategoryAttributeType;
  options: string[] | null;
  required: boolean;
  active: boolean;
}

export interface OfferingAttributeValueView {
  attributeDefinitionId: string;
  textValue: string | null;
  multiValues: string[] | null;
  numberValue: number | null;
  booleanValue: boolean | null;
}

export interface OfferingAttributeContext {
  offeringId: string;
  categoryId: string;
  definitions: OfferingAttributeDefinitionView[];
  values: OfferingAttributeValueView[];
}

/** Decodifica una fila persistida a la forma normalizada que consume tanto el editor admin como (indirectamente, vía dynamic-filters.ts) el catálogo público. Nunca lanza ante un `valueText` de MULTI_SELECT corrupto — fail-closed a `[]`. */
function toValueView(row: {
  attributeDefinitionId: string;
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
}): OfferingAttributeValueView {
  return {
    attributeDefinitionId: row.attributeDefinitionId,
    textValue: row.valueText,
    multiValues: null,
    numberValue: row.valueNumber,
    booleanValue: row.valueBoolean,
  };
}

/**
 * Contexto completo para el editor admin de una oferta: sus definiciones
 * de categoría (todas, activas o no — el editor debe poder mostrar y
 * limpiar un valor de una definición ya desactivada) y sus valores
 * actuales, ya decodificados (MULTI_SELECT parseado desde el JSON
 * serializado en `valueText`).
 */
export async function getOfferingAttributeContext(offeringId: string): Promise<OfferingAttributeContext> {
  const offering = await findOfferingById(offeringId);
  if (!offering) {
    throw new ValidationError('La oferta ya no existe.');
  }

  const [definitions, values] = await Promise.all([
    listAttributeDefinitionsForCategory(offering.categoryId),
    listAttributeValuesForOffering(offeringId),
  ]);

  const valuesByDefinition = new Map(values.map((v) => [v.attributeDefinitionId, v]));

  return {
    offeringId,
    categoryId: offering.categoryId,
    definitions: definitions.map((d) => ({
      id: d.id,
      key: d.key,
      label: d.label,
      type: d.type,
      options: parseAttributeOptionsList(d.options),
      required: d.required,
      active: d.active,
    })),
    values: definitions.map((d) => {
      const row = valuesByDefinition.get(d.id);
      if (!row) {
        return { attributeDefinitionId: d.id, textValue: null, multiValues: null, numberValue: null, booleanValue: null };
      }
      if (d.type === CategoryAttributeType.MULTI_SELECT) {
        let multiValues: string[] | null = null;
        if (row.valueText) {
          try {
            const parsed = JSON.parse(row.valueText);
            multiValues = Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : null;
          } catch {
            multiValues = null; // JSON corrupto — fail-closed, nunca lanza.
          }
        }
        return { attributeDefinitionId: d.id, textValue: null, multiValues, numberValue: null, booleanValue: null };
      }
      return toValueView(row);
    }),
  };
}

/** true si `value` no es un array/string/number "vacío" — usado para decidir upsert vs. delete. */
function isPresent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

/**
 * Único punto de escritura de valores de atributo (cierre operativo de
 * la Fase 12). Reglas fail-closed:
 * - todo `attributeDefinitionId` debe pertenecer a la MISMA categoría que
 *   la oferta (nunca se confía en la categoría enviada por el cliente —
 *   se resuelve la de la oferta real desde la BD);
 * - un id duplicado en el payload se rechaza (ambiguo);
 * - el campo poblado debe coincidir exactamente con el tipo real de la
 *   definición (nunca `multiValues` para un SELECT, ni `numberValue`
 *   para un TEXT, etc.);
 * - SELECT/MULTI_SELECT: cada valor debe pertenecer a `options` cuando
 *   la definición los declara;
 * - MULTI_SELECT se normaliza (dedupe + orden estable) antes de
 *   serializar a JSON en `valueText`.
 * Toda la escritura es una única transacción — si cualquier valor no
 * calza, no se persiste nada (ver replaceOfferingAttributeValues).
 */
export async function updateOfferingAttributeValues(
  input: UpdateOfferingAttributeValuesInput,
  actor: CurrentSession
): Promise<OfferingAttributeContext> {
  const offering = await findOfferingById(input.offeringId);
  if (!offering) {
    throw new ValidationError('La oferta ya no existe.');
  }

  const definitions = await listAttributeDefinitionsForCategory(offering.categoryId);
  const definitionsById = new Map(definitions.map((d) => [d.id, d]));

  const seenIds = new Set<string>();
  const writes: AttributeValueWrite[] = [];
  const deletes: string[] = [];

  for (const entry of input.values) {
    if (seenIds.has(entry.attributeDefinitionId)) {
      throw new ValidationError('Hay un atributo duplicado en la solicitud.');
    }
    seenIds.add(entry.attributeDefinitionId);

    const definition = definitionsById.get(entry.attributeDefinitionId);
    if (!definition) {
      // Nunca pertenece a esta categoría (o no existe) — rechaza toda la
      // actualización en vez de ignorar silenciosamente esta entrada:
      // esta es una acción administrativa autenticada, no un query param
      // público tolerante.
      throw new ValidationError('Uno de los atributos indicados no pertenece a esta oferta.');
    }

    assertShapeMatchesType(entry, definition.type);

    const write = buildWrite(input.offeringId, definition.id, definition.type, entry, parseAttributeOptionsList(definition.options));
    if (write === null) {
      deletes.push(definition.id);
    } else {
      writes.push(write);
    }
  }

  await replaceOfferingAttributeValues(input.offeringId, writes, deletes);

  await recordAudit({
    actorId: actor.adminUser.id,
    action: 'offering.attributes_updated',
    targetType: 'ProductOffering',
    targetId: input.offeringId,
    metadata: { productId: offering.productId, categoryId: offering.categoryId, attributesChanged: input.values.length },
  });

  return getOfferingAttributeContext(input.offeringId);
}

function assertShapeMatchesType(entry: OfferingAttributeValueInput, type: CategoryAttributeType) {
  const populated = {
    textValue: isPresent(entry.textValue),
    multiValues: isPresent(entry.multiValues),
    numberValue: isPresent(entry.numberValue),
    booleanValue: entry.booleanValue !== null && entry.booleanValue !== undefined,
  };
  const expectedField: keyof typeof populated | null =
    type === CategoryAttributeType.SELECT || type === CategoryAttributeType.TEXT
      ? 'textValue'
      : type === CategoryAttributeType.MULTI_SELECT
        ? 'multiValues'
        : type === CategoryAttributeType.BOOLEAN
          ? 'booleanValue'
          : 'numberValue'; // NUMBER / RANGE

  for (const [field, isSet] of Object.entries(populated)) {
    if (isSet && field !== expectedField) {
      throw new ValidationError('El valor enviado no corresponde al tipo real del atributo.');
    }
  }
}

function buildWrite(
  offeringId: string,
  attributeDefinitionId: string,
  type: CategoryAttributeType,
  entry: OfferingAttributeValueInput,
  allowedOptions: string[] | null
): AttributeValueWrite | null {
  if (type === CategoryAttributeType.SELECT || type === CategoryAttributeType.TEXT) {
    if (!isPresent(entry.textValue)) return null;
    const value = entry.textValue!.trim();
    if (type === CategoryAttributeType.SELECT && allowedOptions && !allowedOptions.includes(value)) {
      throw new ValidationError('El valor seleccionado no es una opción válida para este atributo.');
    }
    return { offeringId, attributeDefinitionId, valueText: value, valueNumber: null, valueBoolean: null };
  }

  if (type === CategoryAttributeType.MULTI_SELECT) {
    if (!isPresent(entry.multiValues)) return null;
    const deduped = Array.from(new Set(entry.multiValues!.map((v) => v.trim()).filter(Boolean))).sort();
    if (deduped.length === 0) return null;
    if (allowedOptions) {
      const invalid = deduped.filter((v) => !allowedOptions.includes(v));
      if (invalid.length > 0) {
        throw new ValidationError('Una de las opciones seleccionadas no es válida para este atributo.');
      }
    }
    return { offeringId, attributeDefinitionId, valueText: JSON.stringify(deduped), valueNumber: null, valueBoolean: null };
  }

  if (type === CategoryAttributeType.BOOLEAN) {
    if (entry.booleanValue === null || entry.booleanValue === undefined) return null;
    return { offeringId, attributeDefinitionId, valueText: null, valueNumber: null, valueBoolean: entry.booleanValue };
  }

  // NUMBER / RANGE — ambos reutilizan valueNumber (ver comentario en el schema Prisma).
  if (!isPresent(entry.numberValue)) return null;
  return { offeringId, attributeDefinitionId, valueText: null, valueNumber: entry.numberValue!, valueBoolean: null };
}
