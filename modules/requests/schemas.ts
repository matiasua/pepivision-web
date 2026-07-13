import { z } from 'zod';
import { honeypotSchema } from '@/lib/honeypot';

const consentSchema = z.literal(true, {
  message: 'Debes aceptar el tratamiento de tus datos personales para continuar.',
});

const nameSchema = z.string().trim().min(2, 'Ingresa tu nombre completo.').max(120);
const phoneSchema = z.string().trim().min(6, 'Ingresa un teléfono de contacto válido.').max(30);
const optionalEmailSchema = z
  .string()
  .trim()
  .max(160)
  .email('Revisa el formato de tu correo.')
  .optional()
  .or(z.literal('').transform(() => undefined));

export const GLASS_TYPES = ['Monofocal', 'Bifocal', 'Multifocal', 'No estoy seguro'] as const;
export const TREATMENT_IDS = ['azul', 'ar', 'foto', 'uv', 'delgado', 'raya'] as const;
export const PRESCRIPTION_ANSWERS = ['Sí', 'No', 'No estoy seguro'] as const;

export const quoteRequestSchema = z
  .object({
    frameChoice: z.enum(['catalog', 'advice'], { message: 'Indica si eliges del catálogo o necesitas asesoría.' }),
    frameProductId: z.string().trim().min(1).optional(),
    glassType: z.enum(GLASS_TYPES, { message: 'Selecciona un tipo de cristal.' }),
    treatments: z.array(z.enum(TREATMENT_IDS)).max(TREATMENT_IDS.length).default([]),
    hasPrescription: z.enum(PRESCRIPTION_ANSWERS, { message: 'Indica si cuentas con una receta óptica vigente.' }),
    name: nameSchema,
    phone: phoneSchema,
    email: optionalEmailSchema,
    comuna: z.string().trim().max(80).optional().or(z.literal('').transform(() => undefined)),
    message: z.string().trim().max(1000).optional().or(z.literal('').transform(() => undefined)),
    consent: consentSchema,
    website: honeypotSchema,
  })
  .refine((data) => data.frameChoice !== 'catalog' || !!data.frameProductId, {
    message: 'Selecciona un modelo del catálogo.',
    path: ['frameProductId'],
  });

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;

export const homeVisitRequestSchema = z.object({
  name: nameSchema,
  comuna: z.string().trim().min(2, 'Ingresa tu comuna.').max(80),
  phone: phoneSchema,
  email: optionalEmailSchema,
  attentionType: z
    .enum(['Asesoría para elegir lentes', 'Entrega de lentes', 'Ambas'])
    .optional()
    .or(z.literal('').transform(() => undefined)),
  consent: consentSchema,
  website: honeypotSchema,
});

export type HomeVisitRequestInput = z.infer<typeof homeVisitRequestSchema>;
