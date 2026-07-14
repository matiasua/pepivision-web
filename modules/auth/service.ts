import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { AdminRole } from '@prisma/client';
import { ForbiddenError, ValidationError } from '@/lib/errors';
import { isRateLimited, recordFailure, resetRateLimit } from '@/lib/rate-limit';
import { hashPassword, verifyPassword } from './password';
import {
  clearSessionCookie,
  generateSessionToken,
  hashSessionToken,
  readSessionCookie,
  setSessionCookie,
  SESSION_IDLE_MINUTES,
} from './session';
import type { Prisma } from '@prisma/client';
import {
  countActiveSuperadmins,
  createAdminUser as createAdminUserRow,
  createAuditLogEntry,
  createSession,
  deleteSessionByTokenHash,
  findAdminByEmail,
  findAdminByIdentifier,
  findAdminById,
  findAdminByUsername,
  findSessionByTokenHash,
  listAdminUsers,
  listAuditLogEntries,
  updateAdminUser,
} from './repository';
import type { CreateAdminUserInput, LoginInput } from './schemas';

const LOGIN_RATE_LIMIT_MAX = 5;
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

// Every login failure (unknown identifier, wrong password, inactive user)
// returns this exact same message — see specs/admin-auth/spec.md: never
// reveal which part was wrong, nor whether the account exists, nor whether
// the identifier resolved to an email or a username.
const GENERIC_LOGIN_ERROR = 'Correo/usuario o contraseña incorrectos.';

export interface CurrentSession {
  sessionId: string;
  adminUser: { id: string; email: string; name: string; role: AdminRole; active: boolean };
}

/** Memoized per-request: multiple Server Components can call this without duplicate DB round-trips. */
export const getCurrentSession = cache(async (): Promise<CurrentSession | null> => {
  const rawToken = await readSessionCookie();
  if (!rawToken) return null;

  const tokenHash = hashSessionToken(rawToken);
  const session = await findSessionByTokenHash(tokenHash);
  if (!session) return null;
  if (session.expiresAt < new Date() || !session.adminUser.active) return null;

  return { sessionId: session.id, adminUser: session.adminUser };
});

/** For Server Components that must not render at all without a valid session. */
export async function requireSession(): Promise<CurrentSession> {
  const session = await getCurrentSession();
  if (!session) redirect('/admin');
  return session;
}

/** For Server Components/actions restricted to specific roles — validates server-side, not just hides UI. */
export async function requireRole(roles: AdminRole | AdminRole[]): Promise<CurrentSession> {
  const session = await requireSession();
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(session.adminUser.role)) {
    throw new ForbiddenError('No tienes permiso para realizar esta acción.');
  }
  return session;
}

export type LoginResult = { ok: true } | { ok: false; message: string };

export async function login(
  input: LoginInput,
  context: { ip: string | null; userAgent: string | null }
): Promise<LoginResult> {
  const rateLimitKey = `${context.ip ?? 'unknown'}:${input.identifier}`;

  if (isRateLimited(rateLimitKey, LOGIN_RATE_LIMIT_MAX, LOGIN_RATE_LIMIT_WINDOW_MS)) {
    return { ok: false, message: 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.' };
  }

  const admin = await findAdminByIdentifier(input.identifier);
  const passwordValid = admin ? await verifyPassword(input.password, admin.passwordHash) : false;

  if (!admin || !admin.active || !passwordValid) {
    recordFailure(rateLimitKey, LOGIN_RATE_LIMIT_WINDOW_MS);
    await createAuditLogEntry({
      adminUserId: admin?.id ?? null,
      action: 'admin.login_failed',
      targetType: 'AdminUser',
      targetId: admin?.id ?? null,
      metadata: { identifier: input.identifier },
      ip: context.ip,
    });
    return { ok: false, message: GENERIC_LOGIN_ERROR };
  }

  resetRateLimit(rateLimitKey);

  // A brand-new random token + a brand-new Session row on every login —
  // never reusing or upgrading an existing token — prevents session fixation.
  const rawToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_IDLE_MINUTES * 60 * 1000);
  await createSession({
    adminUserId: admin.id,
    tokenHash: hashSessionToken(rawToken),
    ip: context.ip,
    userAgent: context.userAgent,
    expiresAt,
  });
  await setSessionCookie(rawToken);

  await createAuditLogEntry({
    adminUserId: admin.id,
    action: 'admin.login_succeeded',
    targetType: 'AdminUser',
    targetId: admin.id,
    metadata: undefined,
    ip: context.ip,
  });

  return { ok: true };
}

export async function logout(context: { ip: string | null }): Promise<void> {
  const session = await getCurrentSession();
  const rawToken = await readSessionCookie();
  if (rawToken) {
    await deleteSessionByTokenHash(hashSessionToken(rawToken));
  }
  await clearSessionCookie();

  if (session) {
    await createAuditLogEntry({
      adminUserId: session.adminUser.id,
      action: 'admin.logout',
      targetType: 'AdminUser',
      targetId: session.adminUser.id,
      metadata: undefined,
      ip: context.ip,
    });
  }
}

/**
 * Used only by scripts/create-superadmin.ts — not exposed via any HTTP
 * route. Idempotent: creates the account if it doesn't exist yet;
 * otherwise resets its password (and role/name/active) to the given
 * values — a controlled reset for local dev, never a silent failure.
 */
export async function provisionDevAdminUser(input: {
  email: string;
  username: string;
  name: string;
  password: string;
  role: AdminRole;
}) {
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);
  const existing = await findAdminByEmail(email);

  const usernameOwner = await findAdminByUsername(username);
  if (usernameOwner && usernameOwner.id !== existing?.id) {
    throw new ValidationError(`El nombre de usuario "${username}" ya está en uso por otra cuenta.`);
  }

  if (existing) {
    return updateAdminUser(existing.id, { passwordHash, name: input.name, role: input.role, active: true, username });
  }

  return createAdminUserRow({ email, username, name: input.name, passwordHash, role: input.role });
}

export async function listUsers() {
  return listAdminUsers();
}

export async function createAdminUser(input: CreateAdminUserInput, actor: CurrentSession) {
  const existingEmail = await findAdminByEmail(input.email);
  if (existingEmail) {
    throw new ValidationError('Ya existe un usuario administrador con ese correo.');
  }
  const existingUsername = await findAdminByUsername(input.username);
  if (existingUsername) {
    throw new ValidationError('Ya existe un usuario administrador con ese nombre de usuario.');
  }
  const passwordHash = await hashPassword(input.password);
  const user = await createAdminUserRow({
    email: input.email,
    username: input.username,
    name: input.name,
    passwordHash,
    role: input.role,
  });
  await createAuditLogEntry({
    adminUserId: actor.adminUser.id,
    action: 'admin.user_created',
    targetType: 'AdminUser',
    targetId: user.id,
    metadata: { email: user.email, username: user.username, role: user.role },
    ip: null,
  });
  return user;
}

export async function setUserActive(userId: string, active: boolean, actor: CurrentSession) {
  if (!active) {
    const target = await findAdminById(userId);
    if (target?.role === 'SUPERADMIN') {
      const remaining = await countActiveSuperadmins(userId);
      if (remaining === 0) {
        throw new ValidationError('No puedes desactivar al único SUPERADMIN activo restante.');
      }
    }
  }
  const user = await updateAdminUser(userId, { active });
  await createAuditLogEntry({
    adminUserId: actor.adminUser.id,
    action: active ? 'admin.user_activated' : 'admin.user_deactivated',
    targetType: 'AdminUser',
    targetId: userId,
    metadata: undefined,
    ip: null,
  });
  return user;
}

export async function resetUserPassword(userId: string, newPassword: string, actor: CurrentSession) {
  const passwordHash = await hashPassword(newPassword);
  const user = await updateAdminUser(userId, { passwordHash });
  await createAuditLogEntry({
    adminUserId: actor.adminUser.id,
    action: 'admin.user_password_reset',
    targetType: 'AdminUser',
    targetId: userId,
    metadata: undefined,
    ip: null,
  });
  return user;
}

/** Shared append-only audit helper for every other module's admin mutations. */
export function recordAudit(input: {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ip?: string | null;
}) {
  return createAuditLogEntry({
    adminUserId: input.actorId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    metadata: input.metadata,
    ip: input.ip ?? null,
  });
}

export function getAuditTrail(take?: number) {
  return listAuditLogEntries(take);
}
