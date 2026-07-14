import { afterEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '@/lib/errors';

const findSessionByTokenHash = vi.fn();
const createAuditLogEntry = vi.fn();

vi.mock('@/modules/auth/repository', () => ({
  findSessionByTokenHash: (...args: unknown[]) => findSessionByTokenHash(...args),
  createAuditLogEntry: (...args: unknown[]) => createAuditLogEntry(...args),
  // Unused by this test file's calls, but imported by the module under test.
  countActiveSuperadmins: vi.fn(),
  createAdminUser: vi.fn(),
  createSession: vi.fn(),
  deleteSessionByTokenHash: vi.fn(),
  findAdminByEmail: vi.fn(),
  findAdminByIdentifier: vi.fn(),
  findAdminById: vi.fn(),
  findAdminByUsername: vi.fn(),
  listAdminUsers: vi.fn(),
  listAuditLogEntries: vi.fn(),
  updateAdminUser: vi.fn(),
}));

const readSessionCookie = vi.fn();

vi.mock('@/modules/auth/session', () => ({
  readSessionCookie: (...args: unknown[]) => readSessionCookie(...args),
  clearSessionCookie: vi.fn(),
  setSessionCookie: vi.fn(),
  generateSessionToken: vi.fn(),
  hashSessionToken: (token: string) => `hashed:${token}`,
  SESSION_IDLE_MINUTES: 60,
}));

class RedirectSignal extends Error {
  constructor(public destination: string) {
    super(`REDIRECT:${destination}`);
  }
}

vi.mock('next/navigation', () => ({
  redirect: (destination: string) => {
    throw new RedirectSignal(destination);
  },
}));

const { getCurrentSession, requireSession, requireRole } = await import('@/modules/auth/service');

const activeAdmin = { id: 'admin_1', email: 'admin@pepivision360.cl', name: 'Admin', role: 'ADMIN' as const, active: true };
const inactiveAdmin = { ...activeAdmin, id: 'admin_2', active: false };

function sessionRow(overrides: Partial<{ expiresAt: Date; adminUser: typeof activeAdmin }> = {}) {
  return {
    id: 'sess_1',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    adminUser: activeAdmin,
    ...overrides,
  };
}

describe('modules/auth/service — getCurrentSession', () => {
  afterEach(() => vi.clearAllMocks());

  it('returns null when there is no session cookie at all', async () => {
    readSessionCookie.mockResolvedValue(null);

    expect(await getCurrentSession()).toBeNull();
    expect(findSessionByTokenHash).not.toHaveBeenCalled();
  });

  it('returns null when the cookie does not match any persisted session', async () => {
    readSessionCookie.mockResolvedValue('raw-token');
    findSessionByTokenHash.mockResolvedValue(null);

    expect(await getCurrentSession()).toBeNull();
  });

  it('returns null when the session has already expired', async () => {
    readSessionCookie.mockResolvedValue('raw-token');
    findSessionByTokenHash.mockResolvedValue(sessionRow({ expiresAt: new Date(Date.now() - 1000) }));

    expect(await getCurrentSession()).toBeNull();
  });

  it('returns null when the admin user has been deactivated since the session was created', async () => {
    readSessionCookie.mockResolvedValue('raw-token');
    findSessionByTokenHash.mockResolvedValue(sessionRow({ adminUser: inactiveAdmin }));

    expect(await getCurrentSession()).toBeNull();
  });

  it('returns the session when it is valid and the admin user is active', async () => {
    readSessionCookie.mockResolvedValue('raw-token');
    findSessionByTokenHash.mockResolvedValue(sessionRow());

    const session = await getCurrentSession();
    expect(session).toEqual({ sessionId: 'sess_1', adminUser: activeAdmin });
  });
});

describe('modules/auth/service — requireSession', () => {
  afterEach(() => vi.clearAllMocks());

  it('redirects to /admin when there is no valid session', async () => {
    readSessionCookie.mockResolvedValue(null);

    await expect(requireSession()).rejects.toThrow('REDIRECT:/admin');
  });

  it('returns the session without redirecting when valid', async () => {
    readSessionCookie.mockResolvedValue('raw-token');
    findSessionByTokenHash.mockResolvedValue(sessionRow());

    await expect(requireSession()).resolves.toEqual({ sessionId: 'sess_1', adminUser: activeAdmin });
  });
});

describe('modules/auth/service — requireRole', () => {
  afterEach(() => vi.clearAllMocks());

  it('rejects with ForbiddenError when the session role is not among the allowed roles', async () => {
    readSessionCookie.mockResolvedValue('raw-token');
    findSessionByTokenHash.mockResolvedValue(sessionRow({ adminUser: activeAdmin })); // role: ADMIN

    await expect(requireRole('SUPERADMIN')).rejects.toThrow(ForbiddenError);
  });

  it('succeeds when the session role matches one of an array of allowed roles', async () => {
    readSessionCookie.mockResolvedValue('raw-token');
    findSessionByTokenHash.mockResolvedValue(sessionRow({ adminUser: activeAdmin })); // role: ADMIN

    await expect(requireRole(['ADMIN', 'SUPERADMIN'])).resolves.toEqual({
      sessionId: 'sess_1',
      adminUser: activeAdmin,
    });
  });

  it('redirects (never reaches the role check) when there is no valid session at all', async () => {
    readSessionCookie.mockResolvedValue(null);

    await expect(requireRole('SUPERADMIN')).rejects.toThrow('REDIRECT:/admin');
  });
});
