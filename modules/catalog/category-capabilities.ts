import { z } from 'zod';
import { ValidationError } from '@/lib/errors';
import { quoteOptionsSchema } from './quote-options';

// Perfil por defecto (todo ausente -> estos valores) = el perfil más simple
// posible (listado de producto simple, sin pasos opcionales) — ver
// design.md de redesign-extensible-catalog-v2 → "Capacidades tipadas". No
// corresponde a ninguna de las dos categorías definitivas (ambas activan
// varias capacidades); se mantiene como valor de fábrica seguro para una
// categoría futura (p. ej. "Accesorios"), y una categoría creada sin
// configurar explícitamente sus capacidades no expone accidentalmente
// pasos de cristal/tratamientos/receta/tinte que nadie pidió.
export const categoryCapabilitiesSchema = z.object({
  /// El armazón/producto requiere seleccionar un ProductColor.
  requiresColor: z.boolean().default(true),
  /// Habilita el paso "tipo de cristal" (Monofocal/Bifocal/Progresivo/...).
  allowsLensType: z.boolean().default(false),
  /// Habilita el paso de tratamientos (antirreflejo, filtro azul, etc.).
  allowsTreatments: z.boolean().default(false),
  /// Habilita la pregunta "¿tienes receta óptica vigente?" (Sí/No/No estoy seguro).
  allowsPrescription: z.boolean().default(false),
  /// Habilita el sub-paso de adjuntar el archivo de receta. Solo tiene
  /// efecto cuando allowsPrescription también es true — ver
  /// resolveActiveQuoteSteps() en el cotizador (Fase 7); una categoría con
  /// esto en true pero allowsPrescription en false simplemente nunca
  /// muestra el paso de adjunto (no es un error).
  allowsPrescriptionAttachment: z.boolean().default(false),
  /// Habilita el paso de tinte/color del cristal (lentes de sol).
  allowsLensTint: z.boolean().default(false),
  /// true: el paso "producto/oferta" es una selección de un armazón
  /// concreto (las dos categorías definitivas). false: selector de
  /// producto genérico para una categoría futura que no se basa en elegir
  /// un armazón (p. ej. "Accesorios").
  allowsFrameSelection: z.boolean().default(true),
  /// Fase 9 (motor de compatibilidades): allowlist fina de qué
  /// modalidades de cristal/tratamientos/opciones adicionales admite esta
  /// categoría — ver modules/catalog/quote-options.ts. Distinto de las
  /// capacidades booleanas de arriba: `allowsLensType: true` habilita *que
  /// exista* el paso; `quoteOptions` acota *cuáles valores* aparecen
  /// dentro de ese paso. Opcional a propósito — una categoría sin este
  /// bloque (o con uno inválido) se resuelve fail-closed (sin opciones),
  /// nunca lanza — ver resolveCategoryQuoteOptions().
  quoteOptions: quoteOptionsSchema.optional(),
});

export type CategoryCapabilities = z.infer<typeof categoryCapabilitiesSchema>;

// El propio schema, aplicado a un objeto vacío, produce el perfil por
// defecto (todos los .default() de arriba) — es el mismo fallback que
// usamos tanto para "categoría recién creada sin configurar" como para
// "JSON almacenado inválido" (fail closed).
const FAIL_CLOSED_CAPABILITIES: CategoryCapabilities = categoryCapabilitiesSchema.parse({});

/**
 * Lectura: nunca lanza. Un valor que no pasa el schema (JSON malformado,
 * fila corrupta, columna null) se trata como "sin capacidades opcionales"
 * en vez de romper una página pública — ver design.md → "Capacidades
 * tipadas".
 */
export function parseCategoryCapabilities(value: unknown): CategoryCapabilities {
  const result = categoryCapabilitiesSchema.safeParse(value);
  return result.success ? result.data : FAIL_CLOSED_CAPABILITIES;
}

/** Escritura: estricta — un valor inválido nunca se persiste silenciosamente. */
export function validateCategoryCapabilities(value: unknown): CategoryCapabilities {
  const result = categoryCapabilitiesSchema.safeParse(value);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? 'Capacidades de categoría inválidas.');
  }
  return result.data;
}
