import { describe, expect, it } from 'vitest';
import { createAdminUserSchema, loginSchema, resetPasswordSchema } from '@/modules/auth/schemas';

describe('modules/auth/schemas — loginSchema', () => {
  it('accepts a valid email/password pair', () => {
    expect(loginSchema.safeParse({ email: 'admin@pepivision360.cl', password: 'anything' }).success).toBe(true);
  });

  it('rejects an empty password', () => {
    expect(loginSchema.safeParse({ email: 'admin@pepivision360.cl', password: '' }).success).toBe(false);
  });

  it('lowercases and trims the email', () => {
    const result = loginSchema.safeParse({ email: '  ADMIN@Pepivision360.CL  ', password: 'x' });
    expect(result.success && result.data.email).toBe('admin@pepivision360.cl');
  });
});

describe('modules/auth/schemas — createAdminUserSchema', () => {
  const base = { email: 'nuevo@pepivision360.cl', name: 'Nueva Persona', password: 'una-clave-larga-123', role: 'ADMIN' as const };

  it('accepts a valid new-user payload', () => {
    expect(createAdminUserSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a password shorter than 10 characters', () => {
    expect(createAdminUserSchema.safeParse({ ...base, password: 'short' }).success).toBe(false);
  });

  it('rejects an invalid role', () => {
    expect(createAdminUserSchema.safeParse({ ...base, role: 'OWNER' }).success).toBe(false);
  });
});

describe('modules/auth/schemas — resetPasswordSchema', () => {
  it('requires at least 10 characters', () => {
    expect(resetPasswordSchema.safeParse({ userId: 'u1', password: 'short' }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ userId: 'u1', password: 'una-clave-larga' }).success).toBe(true);
  });
});
