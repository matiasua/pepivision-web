'use server';

import { createAdminUser, requireRole, resetUserPassword, setUserActive } from '@/modules/auth/service';
import { createAdminUserSchema, resetPasswordSchema, toggleUserActiveSchema } from '@/modules/auth/schemas';

type ActionResult = { status: 'error'; message: string } | { status: 'success' };

export async function createUserAction(input: unknown): Promise<ActionResult> {
  const session = await requireRole('SUPERADMIN');
  const parsed = createAdminUserSchema.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Revisa los datos ingresados.' };
  }
  try {
    await createAdminUser(parsed.data, session);
    return { status: 'success' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'No se pudo crear el usuario.' };
  }
}

export async function toggleUserActiveAction(userId: string, active: boolean): Promise<ActionResult> {
  const session = await requireRole('SUPERADMIN');
  const parsed = toggleUserActiveSchema.safeParse({ userId, active });
  if (!parsed.success) {
    return { status: 'error', message: 'Datos inválidos.' };
  }
  try {
    await setUserActive(parsed.data.userId, parsed.data.active, session);
    return { status: 'success' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'No se pudo actualizar el usuario.' };
  }
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const session = await requireRole('SUPERADMIN');
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Revisa la contraseña ingresada.' };
  }
  await resetUserPassword(parsed.data.userId, parsed.data.password, session);
  return { status: 'success' };
}
