import { z } from 'zod';
import { DataRightStatus } from '@prisma/client';
import { optionalNonEmpty } from '@/lib/zod-helpers';

export const changeDataRightsStatusSchema = z
  .object({
    dataRightsRequestId: z.string().min(1),
    status: z.enum(DataRightStatus, { message: 'Selecciona un estado válido.' }),
    resolutionNotes: optionalNonEmpty(z.string().trim().max(1000)),
  })
  .refine(
    (data) =>
      (data.status !== DataRightStatus.RESOLVED && data.status !== DataRightStatus.REJECTED) ||
      !!data.resolutionNotes,
    { message: 'Ingresa una nota al resolver o rechazar una solicitud.', path: ['resolutionNotes'] }
  );
export type ChangeDataRightsStatusInput = z.infer<typeof changeDataRightsStatusSchema>;
