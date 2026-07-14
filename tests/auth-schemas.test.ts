import { describe, expect, it } from 'vitest';
import { createAdminUserSchema, loginSchema, resetPasswordSchema, usernameSchema } from '@/modules/auth/schemas';

describe('modules/auth/schemas — loginSchema', () => {
  it('accepts an email as the identifier', () => {
    expect(loginSchema.safeParse({ identifier: 'admin@pepivision360.cl', password: 'anything' }).success).toBe(true);
  });

  it('accepts a username as the identifier', () => {
    expect(loginSchema.safeParse({ identifier: 'admin', password: 'anything' }).success).toBe(true);
  });

  it('rejects an empty password', () => {
    expect(loginSchema.safeParse({ identifier: 'admin@pepivision360.cl', password: '' }).success).toBe(false);
  });

  it('rejects an empty identifier', () => {
    expect(loginSchema.safeParse({ identifier: '', password: 'x' }).success).toBe(false);
  });

  it('lowercases and trims the identifier, whether email or username', () => {
    const emailResult = loginSchema.safeParse({ identifier: '  ADMIN@Pepivision360.CL  ', password: 'x' });
    expect(emailResult.success && emailResult.data.identifier).toBe('admin@pepivision360.cl');

    const usernameResult = loginSchema.safeParse({ identifier: '  SuperAdmin  ', password: 'x' });
    expect(usernameResult.success && usernameResult.data.identifier).toBe('superadmin');
  });
});

describe('modules/auth/schemas — usernameSchema', () => {
  it('accepts lowercase letters, digits, dot, underscore and hyphen', () => {
    expect(usernameSchema.safeParse('ana.perez').success).toBe(true);
    expect(usernameSchema.safeParse('ana_perez-2').success).toBe(true);
  });

  it('lowercases and trims the value', () => {
    const result = usernameSchema.safeParse('  AnaPerez  ');
    expect(result.success && result.data).toBe('anaperez');
  });

  it('rejects spaces', () => {
    expect(usernameSchema.safeParse('ana perez').success).toBe(false);
  });

  it('rejects values shorter than 3 characters', () => {
    expect(usernameSchema.safeParse('ab').success).toBe(false);
  });

  it('rejects values longer than 30 characters', () => {
    expect(usernameSchema.safeParse('a'.repeat(31)).success).toBe(false);
  });

  it('rejects leading/trailing separators', () => {
    expect(usernameSchema.safeParse('-anaperez').success).toBe(false);
    expect(usernameSchema.safeParse('anaperez.').success).toBe(false);
  });

  it('rejects disallowed characters', () => {
    expect(usernameSchema.safeParse('ana@perez').success).toBe(false);
    expect(usernameSchema.safeParse('ana#perez').success).toBe(false);
  });
});

describe('modules/auth/schemas — createAdminUserSchema', () => {
  const base = {
    email: 'nuevo@pepivision360.cl',
    username: 'nueva.persona',
    name: 'Nueva Persona',
    password: 'una-clave-larga-123',
    role: 'ADMIN' as const,
  };

  it('accepts a valid new-user payload', () => {
    expect(createAdminUserSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a password shorter than 10 characters', () => {
    expect(createAdminUserSchema.safeParse({ ...base, password: 'short' }).success).toBe(false);
  });

  it('rejects an invalid role', () => {
    expect(createAdminUserSchema.safeParse({ ...base, role: 'OWNER' }).success).toBe(false);
  });

  it('rejects a username with spaces or invalid characters', () => {
    expect(createAdminUserSchema.safeParse({ ...base, username: 'nueva persona' }).success).toBe(false);
    expect(createAdminUserSchema.safeParse({ ...base, username: 'nueva@persona' }).success).toBe(false);
  });

  it('lowercases the username', () => {
    const result = createAdminUserSchema.safeParse({ ...base, username: 'Nueva.Persona' });
    expect(result.success && result.data.username).toBe('nueva.persona');
  });
});

describe('modules/auth/schemas — resetPasswordSchema', () => {
  it('requires at least 10 characters', () => {
    expect(resetPasswordSchema.safeParse({ userId: 'u1', password: 'short' }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ userId: 'u1', password: 'una-clave-larga' }).success).toBe(true);
  });
});
