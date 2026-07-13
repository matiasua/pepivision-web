'use server';

import { requireSession } from '@/modules/auth/service';
import { createComunaSchema } from '@/modules/home-visit-coverage/schemas';
import { createComuna, setComunaActive } from '@/modules/home-visit-coverage/service';

export type CreateComunaResult = { status: 'error'; message: string } | { status: 'success' };

export async function createComunaAction(input: unknown): Promise<CreateComunaResult> {
  const session = await requireSession();
  const parsed = createComunaSchema.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Revisa los datos ingresados.' };
  }
  try {
    await createComuna(parsed.data, session);
    return { status: 'success' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'No se pudo crear la comuna.' };
  }
}

export async function toggleComunaAction(comunaId: string, active: boolean): Promise<void> {
  const session = await requireSession();
  await setComunaActive(comunaId, active, session);
}
