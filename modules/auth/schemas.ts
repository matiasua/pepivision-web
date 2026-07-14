import { z } from 'zod';
import { AdminRole } from '@prisma/client';

// Same charset the username backfill migration uses (see
// prisma/migrations/20260713040000_add_admin_user_username) — lowercase
// letters, digits, dot, underscore, hyphen; no spaces; can't start/end with
// a separator. trim+toLowerCase makes uniqueness effectively
// case-insensitive without needing a DB-level citext extension.
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'El nombre de usuario debe tener al menos 3 caracteres.')
  .max(30, 'El nombre de usuario no puede superar 30 caracteres.')
  .regex(
    /^[a-z0-9](?:[a-z0-9_.-]*[a-z0-9])?$/,
    'El nombre de usuario solo puede tener minúsculas, números, puntos, guiones y guiones bajos.'
  );

export const loginSchema = z.object({
  // Accepts either the account's email or its username — resolved by a
  // single lookup in modules/auth/repository.ts, not two separate flows.
  identifier: z.string().trim().toLowerCase().min(1, 'Ingresa tu correo o nombre de usuario.'),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});
export type LoginInput = z.infer<typeof loginSchema>;

const passwordSchema = z
  .string()
  .min(10, 'La contraseña debe tener al menos 10 caracteres.')
  .max(200);

export const createAdminUserSchema = z.object({
  email: z.string().trim().toLowerCase().email('Revisa el formato del correo.'),
  username: usernameSchema,
  name: z.string().trim().min(2, 'Ingresa un nombre.').max(120),
  password: passwordSchema,
  role: z.enum(AdminRole, { message: 'Selecciona un rol.' }),
});
export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;

export const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const toggleUserActiveSchema = z.object({
  userId: z.string().min(1),
  active: z.boolean(),
});
export type ToggleUserActiveInput = z.infer<typeof toggleUserActiveSchema>;

export const updateUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(AdminRole, { message: 'Selecciona un rol.' }),
});
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
