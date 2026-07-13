import { z } from 'zod';
import { optionalNonEmpty } from '@/lib/zod-helpers';

export const createComunaSchema = z.object({
  name: z.string().trim().min(2, 'Ingresa el nombre de la comuna.').max(80),
  region: optionalNonEmpty(z.string().trim().max(80)),
});
export type CreateComunaInput = z.infer<typeof createComunaSchema>;

export const toggleComunaSchema = z.object({
  comunaId: z.string().min(1),
  active: z.boolean(),
});
export type ToggleComunaInput = z.infer<typeof toggleComunaSchema>;
