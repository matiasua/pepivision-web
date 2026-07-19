// Fase 11 (redesign-extensible-catalog-v2 — snapshot histórico
// definitivo): contrato versionado y explícito de `Request.details` para
// solicitudes de cotización. `Request.details` sigue siendo el mismo
// campo `Json?` ya existente — no requiere migración Prisma — pero desde
// aquí en adelante toda escritura nueva incluye `detailsVersion: 2` como
// discriminador inequívoco, nunca inferido por la sola presencia
// accidental de un campo.
//
// Una única función construye el snapshot (`buildRequestSnapshotV2`) y
// una única función lo lee de vuelta, tolerante a filas V1 históricas y a
// JSON corrupto (`parseRequestDetails`) — ningún otro módulo debe
// re-implementar esta lógica.
import { z } from 'zod';
import { ValidationError } from '@/lib/errors';
import { PRESCRIPTION_ANSWERS } from './schemas';

export const REQUEST_DETAILS_V2 = 2 as const;

const domainIdSchema = z.string().trim().min(1).max(60);
const labelSchema = z.string().trim().min(1).max(200);
const MAX_SELECTION_ITEMS = 20;

/**
 * Campos exactos de `specs/request-category-snapshot/spec.md` — ninguno
 * agregado "por si acaso". `.strict()` rechaza cualquier propiedad
 * inesperada al validar antes de persistir.
 */
export const requestDetailsV2Schema = z
  .object({
    detailsVersion: z.literal(REQUEST_DETAILS_V2),
    frameChoice: z.enum(['catalog', 'advice']),
    categoryId: domainIdSchema,
    categoryName: labelSchema,
    categorySlug: domainIdSchema,
    offeringId: domainIdSchema.nullable(),
    priceFromSnapshot: z.number().int().nonnegative().nullable(),
    frameProductId: domainIdSchema.nullable(),
    frameProductName: labelSchema.nullable(),
    frameProductColorId: domainIdSchema.nullable(),
    frameProductColorName: labelSchema.nullable(),
    frameProductColorHex: z.string().trim().max(20).nullable(),
    frameBrandId: domainIdSchema.nullable(),
    frameBrandName: labelSchema.nullable(),
    frameBrandSlug: domainIdSchema.nullable(),
    glassType: labelSchema.nullable(),
    treatments: z.array(domainIdSchema).max(MAX_SELECTION_ITEMS),
    treatmentLabels: z.array(labelSchema).max(MAX_SELECTION_ITEMS),
    additionalOptions: z.array(domainIdSchema).max(MAX_SELECTION_ITEMS),
    additionalOptionLabels: z.array(labelSchema).max(MAX_SELECTION_ITEMS),
    prescriptionAnswer: z.enum(PRESCRIPTION_ANSWERS).nullable(),
  })
  .strict();

export type RequestDetailsV2 = z.infer<typeof requestDetailsV2Schema>;

/** Todo lo que `submitQuote` ya resolvió/validó server-side — nunca un valor crudo del cliente. */
export type BuildRequestSnapshotV2Input = Omit<RequestDetailsV2, 'detailsVersion'>;

/**
 * Único punto de construcción del snapshot V2. Recibe exclusivamente
 * datos ya resueltos por el servidor (categoría/oferta/producto/color
 * desde PostgreSQL, labels desde el motor de compatibilidades) y valida
 * la forma completa antes de devolverlo — si la construcción no calza
 * con el contrato, falla aquí, antes de tocar la base de datos, en vez de
 * persistir una fila con forma inválida.
 */
export function buildRequestSnapshotV2(input: BuildRequestSnapshotV2Input): RequestDetailsV2 {
  const result = requestDetailsV2Schema.safeParse({ detailsVersion: REQUEST_DETAILS_V2, ...input });
  if (!result.success) {
    throw new ValidationError('No se pudo construir el snapshot histórico de la solicitud.');
  }
  return result.data;
}

/**
 * Vista normalizada y estable que todo consumidor (RequestCard.tsx,
 * plantillas de correo, futuros lectores) debe usar en vez de acceder a
 * `Request.details` directamente — así ninguno necesita conocer la
 * diferencia entre V1 y V2. `version` se expone solo para diagnóstico;
 * ningún consumidor debería ramificar su UI en función de él más allá de
 * mostrar u ocultar el bloque "Categoría" (ausente en V1).
 */
export interface NormalizedRequestDetails {
  version: 1 | 2 | 'unknown';
  categoryName: string | null;
  categorySlug: string | null;
  frameChoice: 'catalog' | 'advice' | null;
  frameProductName: string | null;
  frameProductColorName: string | null;
  frameBrandName: string | null;
  glassType: string | null;
  treatmentLabels: string[];
  additionalOptionLabels: string[];
  prescriptionAnswer: string | null;
  priceFromSnapshot: number | null;
}

function unknownDetails(): NormalizedRequestDetails {
  return {
    version: 'unknown',
    categoryName: null,
    categorySlug: null,
    frameChoice: null,
    frameProductName: null,
    frameProductColorName: null,
    frameBrandName: null,
    glassType: null,
    treatmentLabels: [],
    additionalOptionLabels: [],
    prescriptionAnswer: null,
    priceFromSnapshot: null,
  };
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Lector normalizado único (Fase 11, sección 9): fail-safe ante JSON
 * corrupto o con forma desconocida — nunca lanza, nunca derriba un
 * listado completo de solicitudes por una fila mala. Nunca depende de
 * `Category`/`Product` vivos: todo sale del propio `details` persistido.
 */
export function parseRequestDetails(details: unknown): NormalizedRequestDetails {
  if (details === null || typeof details !== 'object' || Array.isArray(details)) {
    return unknownDetails();
  }
  const raw = details as Record<string, unknown>;

  if (raw.detailsVersion === REQUEST_DETAILS_V2) {
    const parsed = requestDetailsV2Schema.safeParse(raw);
    if (!parsed.success) return unknownDetails();
    const d = parsed.data;
    return {
      version: 2,
      categoryName: d.categoryName,
      categorySlug: d.categorySlug,
      frameChoice: d.frameChoice,
      frameProductName: d.frameProductName,
      frameProductColorName: d.frameProductColorName,
      frameBrandName: d.frameBrandName,
      glassType: d.glassType,
      treatmentLabels: d.treatmentLabels,
      additionalOptionLabels: d.additionalOptionLabels,
      prescriptionAnswer: d.prescriptionAnswer,
      priceFromSnapshot: d.priceFromSnapshot,
    };
  }

  // Un `detailsVersion` presente pero distinto de la versión soportada es
  // un formato futuro/desconocido — nunca se interpreta silenciosamente
  // como V1 (sección 4: "no convertir silenciosamente un formato
  // desconocido en V1").
  if ('detailsVersion' in raw) {
    return unknownDetails();
  }

  // Legacy V1 (o el período intermedio de la Fase 10, sin
  // `detailsVersion` todavía) — lectura tolerante, campo por campo, nunca
  // reescrita. "Multifocal" histórico se conserva tal cual, nunca se
  // traduce a "Progresivo".
  return {
    version: 1,
    categoryName: readString(raw.categoryName),
    categorySlug: readString(raw.categorySlug),
    frameChoice: raw.frameChoice === 'catalog' || raw.frameChoice === 'advice' ? raw.frameChoice : null,
    frameProductName: readString(raw.frameProductName),
    frameProductColorName: readString(raw.frameProductColorName),
    frameBrandName: readString(raw.frameBrandName),
    glassType: readString(raw.glassType),
    treatmentLabels: readStringArray(raw.treatmentLabels),
    additionalOptionLabels: readStringArray(raw.additionalOptionLabels),
    prescriptionAnswer: readString(raw.prescriptionAnswer),
    priceFromSnapshot: readNumber(raw.priceFromSnapshot),
  };
}
