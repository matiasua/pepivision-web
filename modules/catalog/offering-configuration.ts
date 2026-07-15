import { z } from 'zod';
import { ValidationError } from '@/lib/errors';

// `configuration` existe únicamente para opciones comerciales
// estructuradas específicas de una oferta, no filtrables/buscables — ver
// design.md de redesign-extensible-catalog-v2 →
// "`ProductOffering.configuration`". Nunca un sustituto de una columna
// estable (p. ej. priceFromClp) ni de un CategoryAttributeDefinition
// filtrable. Versionado con discriminatedUnion, igual que
// Category.capabilities: cada lectura/escritura pasa por este schema,
// nunca se trata como JSON arbitrario.
// `.strict()`: una clave desconocida (p. ej. `featured_color` — un
// atributo filtrable que pertenece a CategoryAttributeDefinition, o
// `priceFromClp` — que duplicaría la columna estable) debe **rechazar**
// todo el objeto, no descartarla silenciosamente (el comportamiento por
// defecto de z.object) — ver design.md, ejemplos inválidos.
const offeringConfigurationV1Schema = z
  .object({
    version: z.literal(1),
    /// Nota comercial interna, solo visible en el panel admin (p. ej.
    /// "incluye estuche rígido") — nunca un filtro, nunca en la tarjeta pública.
    internalMerchandisingNote: z.string().max(300).optional(),
    /// Desglose de precio estructurado reservado para uso futuro (p. ej.
    /// mostrar "armazón + cristales" como dos componentes bajo un mismo
    /// priceFrom) — sin consumidores en v1.
    priceComponents: z
      .array(z.object({ label: z.string().max(60), amountClp: z.number().int().nonnegative() }).strict())
      .max(5)
      .optional(),
  })
  .strict();

export const offeringConfigurationSchema = z.discriminatedUnion('version', [offeringConfigurationV1Schema]);

export type OfferingConfiguration = z.infer<typeof offeringConfigurationSchema>;

/**
 * Lectura: nunca lanza. `configuration` es nullable en BD y ningún
 * consumidor público la necesita todavía — un valor ausente o que no pasa
 * el schema (versión no reconocida, forma inválida) se trata como "sin
 * configuración" (null), nunca como error.
 */
export function parseOfferingConfiguration(value: unknown): OfferingConfiguration | null {
  if (value === null || value === undefined) {
    return null;
  }
  const result = offeringConfigurationSchema.safeParse(value);
  return result.success ? result.data : null;
}

/** Escritura: estricta — un valor inválido (incluida una versión futura no soportada) nunca se persiste. */
export function validateOfferingConfiguration(value: unknown): OfferingConfiguration {
  const result = offeringConfigurationSchema.safeParse(value);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? 'Configuración de oferta inválida.');
  }
  return result.data;
}
