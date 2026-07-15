// Covers Fase 9 integration points 19-22: login/logout, sesión expirada,
// usuario desactivado, permisos ADMIN/SUPERADMIN. Real Postgres, real
// bcrypt password hashing, real in-memory rate limiter — all against
// modules/auth/service.ts's actual functions.
//
// modules/auth/session.ts calls next/headers's cookies(), which throws
// outside of a live Next.js request. Since the goal here is to exercise
// the REAL service+DB+bcrypt+rate-limit interaction (the full-stack
// browser-cookie behavior is exercised separately by the Playwright E2E
// suite — see e2e/admin/auth.spec.ts), this file replaces only that one
// framework-boundary call with an in-memory cookie jar. That is a narrow,
// documented, non-business-logic shim, not a mock of anything under test.
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const cookieJar = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined),
    set: (name: string, value: string) => cookieJar.set(name, value),
    delete: (name: string) => cookieJar.delete(name),
  }),
}));

const { login, logout, getCurrentSession, setUserActive, createAdminUser } = await import('@/modules/auth/service');
const { hashSessionToken, SESSION_COOKIE_NAME, generateSessionToken } = await import('@/modules/auth/session');
const { AdminRole } = await import('@prisma/client');
const { createTestAdmin, deleteTestAdmins, prisma, uniqueTag } = await import('./helpers');

const TEST_PASSWORD = 'Integration-Test-Password-1!';

describe('modules/auth/service — login/logout/session (integration)', () => {
  const adminIds: string[] = [];

  beforeEach(() => {
    cookieJar.clear();
  });

  afterAll(async () => {
    await deleteTestAdmins(adminIds);
  });

  function uniqueIp() {
    return `10.99.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  it('logs in with correct credentials (real bcrypt verify), persists a Session row, and sets the cookie', async () => {
    const { user } = await createTestAdmin(AdminRole.ADMIN);
    adminIds.push(user.id);
    const ip = uniqueIp();

    const result = await login({ identifier: user.email, password: TEST_PASSWORD }, { ip, userAgent: 'vitest' });
    expect(result).toEqual({ ok: true });
    expect(cookieJar.has(SESSION_COOKIE_NAME)).toBe(true);

    const rawToken = cookieJar.get(SESSION_COOKIE_NAME)!;
    const session = await prisma.session.findUnique({ where: { tokenHash: hashSessionToken(rawToken) } });
    expect(session?.adminUserId).toBe(user.id);

    const succeededAudit = await prisma.auditLogEntry.findFirst({
      where: { adminUserId: user.id, action: 'admin.login_succeeded' },
    });
    expect(succeededAudit).not.toBeNull();
  });

  it('rejects a wrong password with the generic message, logs a failed-login audit entry without the password', async () => {
    const { user } = await createTestAdmin(AdminRole.ADMIN);
    adminIds.push(user.id);
    const ip = uniqueIp();

    const result = await login({ identifier: user.username, password: 'not-the-real-password' }, { ip, userAgent: 'vitest' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('Correo/usuario o contraseña incorrectos.');
    }

    const failedAudit = await prisma.auditLogEntry.findFirst({
      where: { adminUserId: user.id, action: 'admin.login_failed' },
    });
    expect(failedAudit).not.toBeNull();
    expect(JSON.stringify(failedAudit?.metadata)).not.toContain('not-the-real-password');
  });

  it('rejects login for a deactivated user with the same generic message (no account-existence leak)', async () => {
    const { user } = await createTestAdmin(AdminRole.ADMIN);
    adminIds.push(user.id);
    await prisma.adminUser.update({ where: { id: user.id }, data: { active: false } });
    const ip = uniqueIp();

    const result = await login({ identifier: user.email, password: TEST_PASSWORD }, { ip, userAgent: 'vitest' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('Correo/usuario o contraseña incorrectos.');
    }
    expect(cookieJar.has(SESSION_COOKIE_NAME)).toBe(false);
  });

  it('logout deletes the persisted Session row and clears the cookie', async () => {
    const { user } = await createTestAdmin(AdminRole.ADMIN);
    adminIds.push(user.id);
    const ip = uniqueIp();

    await login({ identifier: user.email, password: TEST_PASSWORD }, { ip, userAgent: 'vitest' });
    const rawToken = cookieJar.get(SESSION_COOKIE_NAME)!;
    const tokenHash = hashSessionToken(rawToken);

    await logout({ ip });

    expect(cookieJar.has(SESSION_COOKIE_NAME)).toBe(false);
    const session = await prisma.session.findUnique({ where: { tokenHash } });
    expect(session).toBeNull();

    const logoutAudit = await prisma.auditLogEntry.findFirst({ where: { adminUserId: user.id, action: 'admin.logout' } });
    expect(logoutAudit).not.toBeNull();
  });

  it('treats an expired session as invalid (getCurrentSession returns null)', async () => {
    const { user } = await createTestAdmin(AdminRole.ADMIN);
    adminIds.push(user.id);

    const rawToken = generateSessionToken();
    await prisma.session.create({
      data: {
        adminUserId: user.id,
        tokenHash: hashSessionToken(rawToken),
        ip: null,
        userAgent: null,
        expiresAt: new Date(Date.now() - 60_000), // already expired
      },
    });
    cookieJar.set(SESSION_COOKIE_NAME, rawToken);

    const session = await getCurrentSession();
    expect(session).toBeNull();
  });

  it('deactivating a SUPERADMIN succeeds if it is not the last active one', async () => {
    // Self-contained: creates its OWN two synthetic active SUPERADMIN
    // fixtures rather than relying on this environment's real admin
    // accounts also being active SUPERADMINs — that assumption broke in
    // CI, where no bootstrap admin users exist at all (prisma/seed.ts
    // never seeds AdminUser rows; that's a separate, manual
    // `admin:create-superadmin` step). With only the fixture below and no
    // other active SUPERADMIN in the database, deactivating it would
    // correctly trip the "last active SUPERADMIN" guard — so this test
    // creates a second one first, guaranteeing the "allowed" path
    // regardless of what else exists (or doesn't) in the target
    // environment. The "blocked" edge case (deactivating the LAST active
    // SUPERADMIN) is covered separately, in isolation with a mocked
    // repository, by tests/auth-last-superadmin.test.ts.
    const { user: superadminA, session: sessionA } = await createTestAdmin(AdminRole.SUPERADMIN);
    adminIds.push(superadminA.id);
    const { user: superadminB } = await createTestAdmin(AdminRole.SUPERADMIN);
    adminIds.push(superadminB.id);

    const deactivated = await setUserActive(superadminB.id, false, sessionA);
    expect(deactivated.active).toBe(false);

    // The other fixture is untouched — confirms the guard's own count
    // logic isn't what let this succeed (it would also let it succeed if
    // the guard were broken and counted the target itself).
    const superadminAAfter = await prisma.adminUser.findUniqueOrThrow({ where: { id: superadminA.id } });
    expect(superadminAAfter.active).toBe(true);

    const auditEntry = await prisma.auditLogEntry.findFirst({
      where: { targetId: superadminB.id, action: 'admin.user_deactivated' },
    });
    expect(auditEntry).not.toBeNull();
  });

  it('rejects creating a second admin user with a duplicate email or username', async () => {
    const { user, session } = await createTestAdmin(AdminRole.SUPERADMIN);
    adminIds.push(user.id);
    const tag = uniqueTag('dup');

    const created = await createAdminUser(
      { email: `${tag}@integration.test.pepivision360.invalid`, username: tag, name: 'Dup Test', password: TEST_PASSWORD, role: AdminRole.ADMIN },
      session
    );
    adminIds.push(created.id);

    await expect(
      createAdminUser(
        { email: created.email, username: uniqueTag('dup2'), name: 'Dup Test 2', password: TEST_PASSWORD, role: AdminRole.ADMIN },
        session
      )
    ).rejects.toThrow();

    await expect(
      createAdminUser(
        { email: `${uniqueTag('dup3')}@integration.test.pepivision360.invalid`, username: created.username, name: 'Dup Test 3', password: TEST_PASSWORD, role: AdminRole.ADMIN },
        session
      )
    ).rejects.toThrow();
  });
});
