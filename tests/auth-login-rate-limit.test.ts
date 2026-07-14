import { afterEach, describe, expect, it, vi } from 'vitest';

const findAdminByIdentifier = vi.fn();
const createSession = vi.fn();
const createAuditLogEntry = vi.fn();

vi.mock('@/modules/auth/repository', () => ({
  findAdminByIdentifier: (...args: unknown[]) => findAdminByIdentifier(...args),
  createSession: (...args: unknown[]) => createSession(...args),
  createAuditLogEntry: (...args: unknown[]) => createAuditLogEntry(...args),
  countActiveSuperadmins: vi.fn(),
  createAdminUser: vi.fn(),
  deleteSessionByTokenHash: vi.fn(),
  findAdminByEmail: vi.fn(),
  findAdminById: vi.fn(),
  findAdminByUsername: vi.fn(),
  findSessionByTokenHash: vi.fn(),
  listAdminUsers: vi.fn(),
  listAuditLogEntries: vi.fn(),
  updateAdminUser: vi.fn(),
}));

vi.mock('@/modules/auth/session', () => ({
  readSessionCookie: vi.fn(),
  clearSessionCookie: vi.fn(),
  setSessionCookie: vi.fn(),
  generateSessionToken: () => 'raw-token',
  hashSessionToken: (token: string) => `hashed:${token}`,
  SESSION_IDLE_MINUTES: 60,
}));

const verifyPassword = vi.fn();

vi.mock('@/modules/auth/password', () => ({
  hashPassword: vi.fn(),
  verifyPassword: (...args: unknown[]) => verifyPassword(...args),
}));

const { login } = await import('@/modules/auth/service');

const admin = {
  id: 'admin_1',
  email: 'admin@pepivision360.cl',
  username: 'admin',
  passwordHash: 'hash',
  active: true,
};

describe('modules/auth/service — login rate limiting', () => {
  afterEach(() => vi.clearAllMocks());

  it('succeeds on the first attempt with correct credentials (no false-positive rate limiting)', async () => {
    findAdminByIdentifier.mockResolvedValue(admin);
    verifyPassword.mockResolvedValue(true);

    const result = await login(
      { identifier: 'admin@pepivision360.cl', password: 'correct-horse' },
      { ip: '20.0.0.1', userAgent: 'test' }
    );

    expect(result).toEqual({ ok: true });
  });

  it('blocks the same IP+identifier pair after exceeding the per-identifier limit', async () => {
    findAdminByIdentifier.mockResolvedValue(admin);
    verifyPassword.mockResolvedValue(false);
    const ip = '20.0.0.2';

    for (let i = 0; i < 5; i += 1) {
      await login({ identifier: 'admin@pepivision360.cl', password: 'wrong' }, { ip, userAgent: 'test' });
    }

    verifyPassword.mockResolvedValue(true); // even a correct password now must be rejected
    const result = await login({ identifier: 'admin@pepivision360.cl', password: 'correct-horse' }, { ip, userAgent: 'test' });

    expect(result.ok).toBe(false);
  });

  it('blocks further attempts from an IP that sprayed many different identifiers, even though no single identifier hit its own limit', async () => {
    findAdminByIdentifier.mockResolvedValue(null); // every identifier is "unknown"
    const ip = '20.0.0.3';

    // 20 failed attempts, each against a *different* identifier — before the
    // Fase 8 fix, each identifier got its own untouched bucket and this
    // would never trip any limit at all.
    for (let i = 0; i < 20; i += 1) {
      const result = await login({ identifier: `victim-${i}@pepivision360.cl`, password: 'guess' }, { ip, userAgent: 'test' });
      expect(result.ok).toBe(false);
    }

    // The 21st attempt, against yet another brand-new identifier from the
    // same IP, must now be blocked by the shared per-IP bucket.
    const result = await login({ identifier: 'victim-final@pepivision360.cl', password: 'guess' }, { ip, userAgent: 'test' });
    expect(result.ok).toBe(false);
    expect(findAdminByIdentifier).not.toHaveBeenCalledWith('victim-final@pepivision360.cl');
  });

  it('keeps separate identifiers on the same IP independent while under the shared IP-wide limit', async () => {
    findAdminByIdentifier.mockResolvedValue(admin);
    verifyPassword.mockResolvedValue(false);
    const ip = '20.0.0.4';

    // 5 failures against identifier A trips *that* identifier's own bucket...
    for (let i = 0; i < 5; i += 1) {
      await login({ identifier: 'user-a@pepivision360.cl', password: 'wrong' }, { ip, userAgent: 'test' });
    }
    const blockedA = await login({ identifier: 'user-a@pepivision360.cl', password: 'wrong' }, { ip, userAgent: 'test' });
    expect(blockedA.ok).toBe(false);

    // ...but identifier B on the same IP is still allowed to attempt,
    // because the shared per-IP bucket (max 20) hasn't been reached yet.
    verifyPassword.mockResolvedValue(true);
    const resultB = await login({ identifier: 'user-b@pepivision360.cl', password: 'correct-horse' }, { ip, userAgent: 'test' });
    expect(resultB).toEqual({ ok: true });
  });

  it('resets the rate limit counters on a successful login', async () => {
    findAdminByIdentifier.mockResolvedValue(admin);
    const ip = '20.0.0.5';

    verifyPassword.mockResolvedValue(false);
    for (let i = 0; i < 4; i += 1) {
      await login({ identifier: 'admin@pepivision360.cl', password: 'wrong' }, { ip, userAgent: 'test' });
    }

    verifyPassword.mockResolvedValue(true);
    const success = await login({ identifier: 'admin@pepivision360.cl', password: 'correct-horse' }, { ip, userAgent: 'test' });
    expect(success).toEqual({ ok: true });

    // Counter was reset by the success above, so a fresh run of failures
    // needs the full limit again before blocking.
    verifyPassword.mockResolvedValue(false);
    for (let i = 0; i < 4; i += 1) {
      const result = await login({ identifier: 'admin@pepivision360.cl', password: 'wrong' }, { ip, userAgent: 'test' });
      expect(result.ok).toBe(false); // wrong password, but not yet rate-limited
    }
  });
});
