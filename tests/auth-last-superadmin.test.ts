import { afterEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '@/lib/errors';

const countActiveSuperadmins = vi.fn();
const updateAdminUser = vi.fn();
const findAdminById = vi.fn();
const createAuditLogEntry = vi.fn();

vi.mock('@/modules/auth/repository', () => ({
  countActiveSuperadmins: (...args: unknown[]) => countActiveSuperadmins(...args),
  updateAdminUser: (...args: unknown[]) => updateAdminUser(...args),
  findAdminById: (...args: unknown[]) => findAdminById(...args),
  createAuditLogEntry: (...args: unknown[]) => createAuditLogEntry(...args),
  // Unused by this file's calls, but imported by the module under test.
  createAdminUser: vi.fn(),
  createSession: vi.fn(),
  deleteSessionByTokenHash: vi.fn(),
  findAdminByEmail: vi.fn(),
  findAdminByIdentifier: vi.fn(),
  findAdminByUsername: vi.fn(),
  findSessionByTokenHash: vi.fn(),
  listAdminUsers: vi.fn(),
  listAuditLogEntries: vi.fn(),
}));

vi.mock('@/modules/auth/session', () => ({
  readSessionCookie: vi.fn(),
  clearSessionCookie: vi.fn(),
  setSessionCookie: vi.fn(),
  generateSessionToken: vi.fn(),
  hashSessionToken: (token: string) => `hashed:${token}`,
  SESSION_IDLE_MINUTES: 60,
}));

const { setUserActive } = await import('@/modules/auth/service');

const actor = {
  sessionId: 'sess_1',
  adminUser: { id: 'admin_actor', email: 'actor@pepivision360.cl', name: 'Actor', role: 'SUPERADMIN' as const, active: true },
};

describe('modules/auth/service — setUserActive (last active SUPERADMIN guard)', () => {
  afterEach(() => vi.clearAllMocks());

  it('blocks deactivating the sole remaining active SUPERADMIN', async () => {
    findAdminById.mockResolvedValue({ id: 'target', role: 'SUPERADMIN', active: true });
    countActiveSuperadmins.mockResolvedValue(0); // no OTHER active superadmin besides `target`

    await expect(setUserActive('target', false, actor)).rejects.toThrow(ValidationError);
    await expect(setUserActive('target', false, actor)).rejects.toThrow(
      'No puedes desactivar al único SUPERADMIN activo restante.'
    );
    expect(updateAdminUser).not.toHaveBeenCalled();
  });

  it('allows deactivating a SUPERADMIN when at least one other active SUPERADMIN remains', async () => {
    findAdminById.mockResolvedValue({ id: 'target', role: 'SUPERADMIN', active: true });
    countActiveSuperadmins.mockResolvedValue(1); // one other active superadmin exists
    updateAdminUser.mockResolvedValue({ id: 'target', active: false });

    const result = await setUserActive('target', false, actor);
    expect(result.active).toBe(false);
    expect(countActiveSuperadmins).toHaveBeenCalledWith('target'); // excludes the one being deactivated
  });

  it('never runs the superadmin count check when deactivating a plain ADMIN', async () => {
    findAdminById.mockResolvedValue({ id: 'target', role: 'ADMIN', active: true });
    updateAdminUser.mockResolvedValue({ id: 'target', active: false });

    await setUserActive('target', false, actor);
    expect(countActiveSuperadmins).not.toHaveBeenCalled();
  });

  it('never runs the guard at all when activating (only deactivation is restricted)', async () => {
    updateAdminUser.mockResolvedValue({ id: 'target', active: true });

    await setUserActive('target', true, actor);
    expect(findAdminById).not.toHaveBeenCalled();
    expect(countActiveSuperadmins).not.toHaveBeenCalled();
  });
});
