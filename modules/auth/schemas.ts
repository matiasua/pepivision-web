import { z } from 'zod';
import { AdminRole } from '@prisma/client';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Ingresa tu correo.').email('Correo o contraseña incorrectos.'),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});
export type LoginInput = z.infer<typeof loginSchema>;

const passwordSchema = z
  .string()
  .min(10, 'La contraseña debe tener al menos 10 caracteres.')
  .max(200);

export const createAdminUserSchema = z.object({
  email: z.string().trim().toLowerCase().email('Revisa el formato del correo.'),
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
