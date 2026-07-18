// redesign-extensible-catalog-v2 (Fase 9 — motor de compatibilidades, ver
// design.md → "Compatibilidades del cotizador por categoría" y sus dos
// correcciones internas documentadas ahí mismo). Fuente canónica, tipada y
// server-safe de qué modalidades de cristal, tratamientos y opciones
// adicionales admite cada categoría — reemplaza cualquier condición
// dispersa tipo `categorySlug === 'lentes-opticos'` por un único módulo de
// dominio consultable. No depende de React; consumible desde server,
// tests y (en una fase posterior) la GUI del cotizador.
//
// Deliberadamente NO integrado todavía en modules/requests/schemas.ts,
// QuoteWizard.tsx ni modules/requests/service.ts — esa integración visual/
// de persistencia pertenece a la fase siguiente (cotizador configurable).
import { z } from 'zod';
import { ValidationError } from '@/lib/errors';
import { LENS_TYPES, type LensType } from '@/modules/requests/lens-types';
import { TREATMENTS } from '@/modules/requests/treatments-content';
import { ADDITIONAL_OPTIONS } from '@/modules/requests/additional-options';
import { parseOfferingConfiguration } from './offering-configuration';
import { isReservedLegacyCategorySlug } from './legacy-slugs';

// --- Catálogo nuevo de esta fase: modalidades de Lentes de sol ---
// No pertenece a modules/requests/lens-types.ts (Fase 7, contenido público
// de /cristales, exclusivamente óptico) — ver design.md, corrección #1.
export const SUN_LENS_MODALITY_IDS = ['sin-graduacion', 'solar-monofocal', 'solar-progresivo'] as const;
export type SunLensModality = (typeof SUN_LENS_MODALITY_IDS)[number];

/** Unión de todas las modalidades/tipos de cristal posibles, en cualquier categoría. */
export const LENS_MODALITY_IDS = [...LENS_TYPES, ...SUN_LENS_MODALITY_IDS] as const;
export type LensModalityId = LensType | SunLensModality;

const TREATMENT_IDS = TREATMENTS.map((t) => t.id) as [string, ...string[]];
const ADDITIONAL_OPTION_IDS = ADDITIONAL_OPTIONS.map((o) => o.id) as [string, ...string[]];

// --- Catálogo nuevo de esta fase: tratamientos exclusivos de lentes de
// sol, sin equivalente en modules/requests/treatments-content.ts (Fase 7,
// catálogo público de /cristales — no se toca en esta fase) ---
// `uv400` es un ID estable e independiente de `proteccion-uv`: representa
// la certificación de bloqueo UVA/UVB hasta 400nm, propia del rubro de
// lentes de sol — nunca un alias ni una transformación automática de
// "Protección UV" (ver design.md, corrección de esta fase). Una oferta
// nunca se puede afirmar "UV400" solo por tener `proteccion-uv`; son dos
// hechos comerciales distintos que deben declararse por separado.
export const SOLAR_TREATMENT_IDS = ['uv400'] as const;
export type SolarTreatmentId = (typeof SOLAR_TREATMENT_IDS)[number];

const QUOTE_TREATMENT_IDS = [...TREATMENT_IDS, ...SOLAR_TREATMENT_IDS] as [string, ...string[]];

/** Modalidades que son, por definición, exclusivamente sin receta (ver design.md, "Regla de graduación por modalidad"). */
const PRESCRIPTION_FORBIDDEN_MODALITIES = new Set<LensModalityId>(['sin-graduacion']);

function requiresPrescription(modality: LensModalityId): boolean {
  return !PRESCRIPTION_FORBIDDEN_MODALITIES.has(modality);
}

// --- quoteOptionsSchema: bloque que extiende Category.capabilities ---
const quoteOptionsV1Schema = z
  .object({
    version: z.literal(1),
    lensTypes: z.array(z.enum(LENS_MODALITY_IDS as unknown as [LensModalityId, ...LensModalityId[]])).max(LENS_MODALITY_IDS.length),
    treatments: z.array(z.enum(QUOTE_TREATMENT_IDS)).max(QUOTE_TREATMENT_IDS.length),
    additionalOptions: z.array(z.enum(ADDITIONAL_OPTION_IDS)).max(ADDITIONAL_OPTION_IDS.length),
  })
  .strict();

export const quoteOptionsSchema = z.discriminatedUnion('version', [quoteOptionsV1Schema]);
export type QuoteOptions = z.infer<typeof quoteOptionsSchema>;

/** Allowlist vacía — el resultado fail-closed cuando una categoría no tiene (o tiene inválido) `quoteOptions`. Nunca habilita nada por defecto. */
const CLOSED_QUOTE_OPTIONS: QuoteOptions = { version: 1, lensTypes: [], treatments: [], additionalOptions: [] };

// --- Matriz comercial definitiva (design.md → tabla "Compatibilidades del cotizador") ---
export const LENTES_OPTICOS_QUOTE_OPTIONS: QuoteOptions = {
  version: 1,
  lensTypes: ['monofocal', 'bifocal', 'progresivo'],
  treatments: ['antirreflejo', 'filtro-azul-violeta', 'fotocromatico', 'proteccion-uv', 'resistencia-rayaduras'],
  additionalOptions: ['alto-indice'],
};

export const LENTES_DE_SOL_QUOTE_OPTIONS: QuoteOptions = {
  version: 1,
  lensTypes: ['sin-graduacion', 'solar-monofocal', 'solar-progresivo'],
  // `uv400`, no `proteccion-uv` — son IDs distintos, nunca intercambiables
  // (ver design.md, corrección "UV400 como ID independiente"). Lentes de
  // sol nunca ofrece `proteccion-uv` genérico; Lentes ópticos nunca ofrece
  // `uv400`.
  treatments: ['uv400', 'resistencia-rayaduras'],
  additionalOptions: ['polarizado', 'degradado', 'espejado', 'solar-graduado'],
};

/**
 * Lectura fail-closed: un valor ausente o que no pasa el schema (JSON
 * malformado, versión no reconocida, categoría sin quoteOptions
 * configurado) se trata como "sin opciones habilitadas" — nunca lanza,
 * nunca habilita nada por default. Mismo criterio que
 * parseCategoryCapabilities.
 */
export function resolveCategoryQuoteOptions(rawQuoteOptions: unknown): QuoteOptions {
  if (rawQuoteOptions === null || rawQuoteOptions === undefined) {
    return CLOSED_QUOTE_OPTIONS;
  }
  const result = quoteOptionsSchema.safeParse(rawQuoteOptions);
  return result.success ? result.data : CLOSED_QUOTE_OPTIONS;
}

/** Escritura: estricta — un valor inválido nunca se persiste silenciosamente (mismo criterio que validateCategoryCapabilities). */
export function validateQuoteOptions(value: unknown): QuoteOptions {
  const result = quoteOptionsSchema.safeParse(value);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? 'Compatibilidades de cotizador inválidas.');
  }
  return result.data;
}

export function isLensModalitySelectable(options: QuoteOptions, id: string): boolean {
  return (options.lensTypes as readonly string[]).includes(id);
}

export function isTreatmentSelectable(options: QuoteOptions, id: string): boolean {
  return (options.treatments as readonly string[]).includes(id);
}

export function isAdditionalOptionSelectable(options: QuoteOptions, id: string): boolean {
  return (options.additionalOptions as readonly string[]).includes(id);
}

/**
 * Oferta con el contexto mínimo necesario para resolver sus opciones
 * efectivas — ver `getEffectiveOfferingLensOptions`.
 */
export interface OfferingLensContext {
  category: { capabilities: unknown };
  /** `ProductOffering.configuration`, sin parsear (JSON crudo o `null`) — esta función lo valida internamente. */
  configuration?: unknown;
}

/**
 * Intersección segura entre las compatibilidades de la Category y la
 * configuración de la ProductOffering: una oferta puede **restringir**,
 * nunca **ampliar**, las opciones de su categoría. `configuration.
 * lensOptionExclusions` (ver offering-configuration.ts) es exclusivamente
 * sustractivo — resta IDs del resultado de la categoría, nunca agrega
 * ninguno — así que "ampliar la matriz de categoría" es estructuralmente
 * imposible desde una oferta, sin necesidad de una validación cruzada
 * adicional. Una `configuration` ausente o inválida (fail-closed, ver
 * `parseOfferingConfiguration`) simplemente no excluye nada: el resultado
 * efectivo es exactamente el de la categoría.
 */
export function getEffectiveOfferingLensOptions(offering: OfferingLensContext): QuoteOptions {
  const categoryOptions = resolveCategoryQuoteOptions(
    (offering.category.capabilities as { quoteOptions?: unknown } | null)?.quoteOptions
  );
  const configuration = parseOfferingConfiguration(offering.configuration);
  const exclusions = configuration?.lensOptionExclusions;
  if (!exclusions) {
    return categoryOptions;
  }
  const excludedTreatments = new Set(exclusions.treatments ?? []);
  const excludedAdditionalOptions = new Set(exclusions.additionalOptions ?? []);
  return {
    ...categoryOptions,
    treatments: categoryOptions.treatments.filter((id) => !excludedTreatments.has(id)),
    additionalOptions: categoryOptions.additionalOptions.filter((id) => !excludedAdditionalOptions.has(id)),
  };
}

// --- Modelo de selección normalizado (design.md, "Modelo de selección") ---
const MAX_SELECTION_ITEMS = LENS_MODALITY_IDS.length + TREATMENT_IDS.length + ADDITIONAL_OPTION_IDS.length;

/**
 * Entrada normalizada para `validateLensSelection`. No persiste todavía un
 * snapshot definitivo (eso pertenece a la Fase 11, snapshot de
 * solicitudes) — sirve exclusivamente para validación de dominio.
 */
export const lensSelectionInputSchema = z.object({
  categoryId: z.string().trim().min(1).optional(),
  categorySlug: z.string().trim().min(1).optional(),
  offeringId: z.string().trim().min(1).optional(),
  lensModality: z.string().trim().min(1).max(60),
  treatments: z.array(z.string().trim().min(1).max(60)).max(MAX_SELECTION_ITEMS),
  additionalOptions: z.array(z.string().trim().min(1).max(60)).max(MAX_SELECTION_ITEMS),
  needsPrescription: z.boolean(),
});
export type LensSelectionInput = z.infer<typeof lensSelectionInputSchema>;

/** Contexto ya resuelto server-side (nunca construido a partir de un id "confiado" del cliente sin verificar). */
export interface LensSelectionContext {
  category: { id: string; slug: string; active: boolean; visible: boolean; capabilities: unknown };
  offering?: {
    id: string;
    categoryId: string;
    productId: string;
    active: boolean;
    visible: boolean;
    deletedAt: Date | null;
    /** `ProductOffering.configuration` sin parsear — ver `getEffectiveOfferingLensOptions`. */
    configuration?: unknown;
  } | null;
  product?: { id: string; visible: boolean } | null;
}

export type LensSelectionErrorCode =
  | 'unknown_category'
  | 'legacy_category_slug'
  | 'inactive_category'
  | 'offering_mismatch'
  | 'inactive_offering'
  | 'inactive_product'
  | 'unknown_lens_modality'
  | 'unknown_treatment'
  | 'unknown_additional_option'
  | 'duplicate_treatment'
  | 'duplicate_additional_option'
  | 'prescription_required'
  | 'prescription_forbidden'
  | 'invalid_input';

export interface LensSelectionError {
  field: string;
  code: LensSelectionErrorCode;
  message: string;
}

export type LensSelectionResult =
  | { ok: true; data: { lensModality: LensModalityId; treatments: string[]; additionalOptions: string[]; needsPrescription: boolean } }
  | { ok: false; errors: LensSelectionError[] };

function hasDuplicates(ids: string[]): boolean {
  return new Set(ids).size !== ids.length;
}

/**
 * Validación de dominio fail-closed, server-side, equivalente al
 * `validateLensSelection` descrito en design.md. Nunca confía en el
 * navegador: recibe un `context` que el llamador ya resolvió/verificó
 * contra PostgreSQL (ver `resolveAndValidateLensSelection` para la
 * variante que hace esa resolución por ti). Una configuración
 * desconocida o inválida nunca habilita opciones — el resultado por
 * defecto ante cualquier duda es "sin selección compatible".
 */
export function validateLensSelection(rawInput: unknown, context: LensSelectionContext): LensSelectionResult {
  const parsedInput = lensSelectionInputSchema.safeParse(rawInput);
  if (!parsedInput.success) {
    return {
      ok: false,
      errors: [{ field: 'input', code: 'invalid_input', message: 'La selección enviada tiene un formato inválido.' }],
    };
  }
  const input = parsedInput.data;
  const errors: LensSelectionError[] = [];

  if (isReservedLegacyCategorySlug(context.category.slug)) {
    errors.push({ field: 'category', code: 'legacy_category_slug', message: 'La categoría indicada ya no está disponible.' });
  }
  if (!context.category.active || !context.category.visible) {
    errors.push({ field: 'category', code: 'inactive_category', message: 'La categoría indicada no está disponible.' });
  }

  if (context.offering !== undefined && context.offering !== null) {
    const offering = context.offering;
    if (offering.categoryId !== context.category.id || offering.deletedAt !== null) {
      errors.push({ field: 'offeringId', code: 'offering_mismatch', message: 'La oferta indicada no pertenece a esta categoría.' });
    } else {
      if (!offering.active || !offering.visible) {
        errors.push({ field: 'offeringId', code: 'inactive_offering', message: 'La oferta indicada no está disponible.' });
      }
      if (context.product && !context.product.visible) {
        errors.push({ field: 'offeringId', code: 'inactive_product', message: 'El producto indicado no está disponible.' });
      }
    }
  }

  // Si ya hay un error de categoría inactiva, la allowlist efectiva no es
  // confiable — se resuelve fail-closed (vacía) en vez de seguir
  // calculándola, así que ninguna opción puede "colarse" aunque el resto
  // de la selección luzca bien formada. Si hay oferta, sus exclusiones
  // (`configuration.lensOptionExclusions`) intersectan el resultado de la
  // categoría — nunca lo amplían, ver `getEffectiveOfferingLensOptions`.
  const effectiveOptions = errors.some((e) => e.code === 'inactive_category')
    ? CLOSED_QUOTE_OPTIONS
    : getEffectiveOfferingLensOptions({ category: context.category, configuration: context.offering?.configuration });

  if (!isLensModalitySelectable(effectiveOptions, input.lensModality)) {
    errors.push({
      field: 'lensModality',
      code: 'unknown_lens_modality',
      message: 'El tipo de cristal seleccionado no está disponible para esta categoría.',
    });
  } else {
    const modality = input.lensModality as LensModalityId;
    const mustHavePrescription = requiresPrescription(modality);
    if (mustHavePrescription && !input.needsPrescription) {
      errors.push({
        field: 'needsPrescription',
        code: 'prescription_required',
        message: 'Este tipo de cristal requiere una receta óptica.',
      });
    }
    if (!mustHavePrescription && input.needsPrescription) {
      errors.push({
        field: 'needsPrescription',
        code: 'prescription_forbidden',
        message: 'Esta modalidad es exclusivamente sin graduación.',
      });
    }
  }

  if (hasDuplicates(input.treatments)) {
    errors.push({ field: 'treatments', code: 'duplicate_treatment', message: 'Hay tratamientos duplicados en la selección.' });
  }
  for (const treatmentId of input.treatments) {
    if (!isTreatmentSelectable(effectiveOptions, treatmentId)) {
      errors.push({
        field: 'treatments',
        code: 'unknown_treatment',
        message: `El tratamiento "${treatmentId}" no está disponible para esta categoría.`,
      });
    }
  }

  if (hasDuplicates(input.additionalOptions)) {
    errors.push({
      field: 'additionalOptions',
      code: 'duplicate_additional_option',
      message: 'Hay opciones adicionales duplicadas en la selección.',
    });
  }
  for (const optionId of input.additionalOptions) {
    if (!isAdditionalOptionSelectable(effectiveOptions, optionId)) {
      errors.push({
        field: 'additionalOptions',
        code: 'unknown_additional_option',
        message: `La opción "${optionId}" no está disponible para esta categoría.`,
      });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      lensModality: input.lensModality as LensModalityId,
      treatments: [...input.treatments],
      additionalOptions: [...input.additionalOptions],
      needsPrescription: input.needsPrescription,
    },
  };
}

/** Azúcar sintáctica sobre `validateLensSelection` para un chequeo booleano simple (contrato de la fase siguiente). */
export function isLensSelectionCompatible(rawInput: unknown, context: LensSelectionContext): boolean {
  return validateLensSelection(rawInput, context).ok;
}
