import { z } from 'zod';

export const businessSettingsFormSchema = z.object({
  whatsappNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{8,15}$/, 'Ingresa el número en formato internacional, solo dígitos (ej: 56912345678).'),
  phoneDisplay: z.string().trim().min(1, 'Ingresa el teléfono visible.').max(40),
  email: z.string().trim().toLowerCase().email('Revisa el formato del correo.'),
  instagramHandle: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9._]{1,40}$/, 'Usuario de Instagram inválido (sin @).'),
  hoursText: z.string().trim().min(1, 'Ingresa el horario de atención.').max(160),
  locationText: z.string().trim().min(1, 'Ingresa la ubicación.').max(160),
  requestRetentionMonths: z.coerce.number().int().min(1).max(120),
  dataRightsRetentionMonths: z.coerce.number().int().min(1).max(120),
});

export type BusinessSettingsFormInput = z.infer<typeof businessSettingsFormSchema>;
