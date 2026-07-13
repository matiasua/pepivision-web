import { z } from 'zod';
import { honeypotSchema } from '@/lib/honeypot';

export const RIGHT_TYPES = {
  ACCESS: 'Acceso',
  RECTIFICATION: 'Rectificación',
  CANCELLATION: 'Cancelación / Supresión',
  OPPOSITION: 'Oposición',
  PORTABILITY: 'Portabilidad',
  BLOCKING: 'Bloqueo',
} as const;

export const dataRightsRequestSchema = z.object({
  name: z.string().trim().min(2, 'Ingresa tu nombre completo.').max(120),
  email: z.string().trim().max(160).email('Revisa el formato de tu correo.'),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  rightType: z.enum(Object.keys(RIGHT_TYPES) as [keyof typeof RIGHT_TYPES], {
    message: 'Selecciona el derecho que deseas ejercer.',
  }),
  description: z.string().trim().min(10, 'Describe tu solicitud con un poco más de detalle.').max(1000),
  consent: z.literal(true, {
    message: 'Debes autorizar el tratamiento de tus datos para gestionar esta solicitud.',
  }),
  website: honeypotSchema,
});

export type DataRightsRequestInput = z.infer<typeof dataRightsRequestSchema>;
