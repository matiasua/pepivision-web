import { z } from 'zod';
import { honeypotSchema } from '@/lib/honeypot';
import { optionalNonEmpty } from '@/lib/zod-helpers';

const consentSchema = z.literal(true, {
  message: 'Debes aceptar el tratamiento de tus datos personales para continuar.',
});

const nameSchema = z.string().trim().min(2, 'Ingresa tu nombre completo.').max(120);
const phoneSchema = z.string().trim().min(6, 'Ingresa un teléfono de contacto válido.').max(30);
const optionalEmailSchema = optionalNonEmpty(z.string().trim().max(160).email('Revisa el formato de tu correo.'));

// "Progresivo" reemplaza el nombre legado "Multifocal" (Fase 7,
// redesign-extensible-catalog-v2 → spec lens-configuration): una nueva
// solicitud con glassType: "Multifocal" ahora es rechazada por
// quoteRequestSchema. Filas históricas de Request.details que ya
// persistieron "Multifocal" no se reescriben — siguen siendo legibles tal
// cual en el panel admin (RequestCard.tsx renderiza el string guardado sin
// transformarlo).
export const GLASS_TYPES = ['Monofocal', 'Bifocal', 'Progresivo', 'No estoy seguro'] as const;
export const TREATMENT_IDS = ['azul', 'ar', 'foto', 'uv', 'delgado', 'raya'] as const;
export const PRESCRIPTION_ANSWERS = ['Sí', 'No', 'No estoy seguro'] as const;

export const quoteRequestSchema = z
  .object({
    frameChoice: z.enum(['catalog', 'advice'], { message: 'Indica si eliges del catálogo o necesitas asesoría.' }),
    frameProductId: z.string().trim().min(1).optional(),
    // Client-sent value only picks which color to *look up*; the real
    // name/hex persisted on the request are always resolved from
    // PostgreSQL server-side (see modules/requests/service.ts) — never
    // trusted verbatim from the browser.
    frameProductColorId: z.string().trim().min(1).optional(),
    glassType: z.enum(GLASS_TYPES, { message: 'Selecciona un tipo de cristal.' }),
    treatments: z.array(z.enum(TREATMENT_IDS)).max(TREATMENT_IDS.length).default([]),
    hasPrescription: z.enum(PRESCRIPTION_ANSWERS, { message: 'Indica si cuentas con una receta óptica vigente.' }),
    name: nameSchema,
    phone: phoneSchema,
    email: optionalEmailSchema,
    comuna: optionalNonEmpty(z.string().trim().max(80)),
    message: optionalNonEmpty(z.string().trim().max(1000)),
    consent: consentSchema,
    website: honeypotSchema,
  })
  .refine((data) => data.frameChoice !== 'catalog' || !!data.frameProductId, {
    message: 'Selecciona un modelo del catálogo.',
    path: ['frameProductId'],
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
