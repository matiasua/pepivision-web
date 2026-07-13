'use server';

import { requireSession } from '@/modules/auth/service';
import { toggleRequestStatus, deleteRequest } from '@/modules/requests/admin-service';
import { changeDataRightsStatusSchema } from '@/modules/data-rights/admin-schemas';
import { changeDataRightsStatus } from '@/modules/data-rights/admin-service';

export async function toggleRequestStatusAction(requestId: string): Promise<void> {
  const session = await requireSession();
  await toggleRequestStatus(requestId, session);
}

export async function deleteRequestAction(requestId: string): Promise<void> {
  const session = await requireSession();
  await deleteRequest(requestId, session);
}

export type ChangeArcoStatusResult = { status: 'error'; message: string } | { status: 'success' };

export async function changeArcoStatusAction(input: unknown): Promise<ChangeArcoStatusResult> {
  const session = await requireSession();
  const parsed = changeDataRightsStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Revisa los datos ingresados.' };
  }
  try {
    await changeDataRightsStatus(parsed.data, session);
    return { status: 'success' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'No se pudo actualizar la solicitud.' };
  }
}
