'use server';

import { requireRole } from '@/modules/auth/service';
import { businessSettingsFormSchema } from '@/modules/business-settings/schemas';
import { updateBusinessSettings } from '@/modules/business-settings/service';

export type UpdateSettingsResult = { status: 'error'; message: string } | { status: 'success' };

export async function updateBusinessSettingsAction(input: unknown): Promise<UpdateSettingsResult> {
  const session = await requireRole('SUPERADMIN');
  const parsed = businessSettingsFormSchema.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Revisa los datos ingresados.' };
  }
  await updateBusinessSettings(parsed.data, session);
  return { status: 'success' };
}
