import { z } from 'zod';
import { honeypotSchema } from '@/lib/honeypot';
import { optionalNonEmpty } from '@/lib/zod-helpers';

const consentSchema = z.literal(true, {
  message: 'Debes aceptar el tratamiento de tus datos personales para continuar.',
});

const nameSchema = z.string().trim().min(2, 'Ingresa tu nombre completo.').max(120);
const phoneSchema = z.string().trim().min(6, 'Ingresa un teléfono de contacto válido.').max(30);
const optionalEmailSchema = optionalNonEmpty(z.string().trim().max(160).email('Revisa el formato de tu correo.'));

// Vocabulario V1, retirado de nuevas solicitudes (Fase 10,
// redesign-extensible-catalog-v2 → cotizador configurable) — se mantiene
// exportado únicamente como referencia histórica de qué pudo haber
// quedado persistido en filas antiguas de `Request.details` (nunca
// reescritas). El cotizador ya no valida contra un enum fijo aquí: la
// selección real de tipo de cristal/tratamientos/opciones se valida
// exclusivamente contra la allowlist efectiva de la categoría resuelta
// (ver modules/catalog/quote-options-service.ts#resolveAndValidateLensSelection)
// — nunca una segunda matriz de compatibilidades en este archivo.
export const LEGACY_GLASS_TYPES = ['Monofocal', 'Bifocal', 'Progresivo', 'Multifocal', 'No estoy seguro'] as const;
export const LEGACY_TREATMENT_IDS = ['azul', 'ar', 'foto', 'uv', 'delgado', 'raya'] as const;
export const PRESCRIPTION_ANSWERS = ['Sí', 'No', 'No estoy seguro'] as const;

const MAX_SELECTION_ITEMS = 20;

// IDs de dominio acotados por longitud/forma aquí (defensa superficial
// contra payloads absurdos); la validación semántica real — cuáles IDs
// existen y cuáles admite la categoría resuelta — vive exclusivamente en
// el motor de compatibilidades de la Fase 9, nunca duplicada en este schema.
const domainIdSchema = z.string().trim().min(1).max(60);

export const quoteRequestSchema = z
  .object({
    // Toda solicitud nueva queda scopeada a una categoría — reemplaza el
    // flujo V1 sin categoría (Fase 10). Filas históricas sin este campo
    // siguen siendo válidas/legibles: este schema solo gobierna
    // solicitudes nuevas.
    categoryId: domainIdSchema,
    frameChoice: z.enum(['catalog', 'advice'], { message: 'Indica si eliges del catálogo o necesitas asesoría.' }),
    // Reemplaza a `frameProductId` (V1): ahora se elige una ProductOffering
    // concreta (oferta comercial dentro de la categoría), no un Product
    // suelto — el Product/marca/color se re-resuelven server-side desde
    // esta oferta, nunca desde un id de producto enviado directamente por
    // el cliente.
    offeringId: domainIdSchema.optional(),
    // El valor enviado solo elige *cuál* color mirar; nombre/hex reales se
    // resuelven siempre desde PostgreSQL server-side — nunca confiados tal
    // cual del navegador.
    frameProductColorId: domainIdSchema.optional(),
    // ID estable del motor de compatibilidades (p. ej. "monofocal",
    // "sin-graduacion", "solar-progresivo") — nunca el label visible.
    // Ausente cuando la categoría resuelta no ofrece paso de cristal, o
    // cuando frameChoice es "advice" y la categoría no lo exige.
    lensModality: domainIdSchema.optional(),
    treatments: z.array(domainIdSchema).max(MAX_SELECTION_ITEMS).default([]),
    additionalOptions: z.array(domainIdSchema).max(MAX_SELECTION_ITEMS).default([]),
    // Ausente cuando la modalidad resuelta no requiere graduación (p. ej.
    // "sin-graduacion") — el motor de compatibilidades exige/rechaza esto
    // server-side, ver requiresPrescription() en quote-options.ts.
    hasPrescription: z.enum(PRESCRIPTION_ANSWERS, { message: 'Indica si cuentas con una receta óptica vigente.' }).optional(),
    name: nameSchema,
    phone: phoneSchema,
    email: optionalEmailSchema,
    comuna: optionalNonEmpty(z.string().trim().max(80)),
    message: optionalNonEmpty(z.string().trim().max(1000)),
    consent: consentSchema,
    website: honeypotSchema,
  })
  .refine((data) => data.frameChoice !== 'catalog' || !!data.offeringId, {
    message: 'Selecciona un modelo del catálogo.',
    path: ['offeringId'],
  })
  .refine((data) => data.frameChoice !== 'catalog' || !!data.frameProductColorId, {
    message: 'Selecciona un color para este modelo.',
    path: ['frameProductColorId'],
  });

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;

export const homeVisitRequestSchema = z.object({
  name: nameSchema,
  comuna: z.string().trim().min(2, 'Ingresa tu comuna.').max(80),
  phone: phoneSchema,
  email: optionalEmailSchema,
  attentionType: optionalNonEmpty(z.enum(['Asesoría para elegir lentes', 'Entrega de lentes', 'Ambas'])),
  consent: consentSchema,
  website: honeypotSchema,
});

export type HomeVisitRequestInput = z.infer<typeof homeVisitRequestSchema>;
