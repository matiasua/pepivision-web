import { randomBytes, createHmac } from 'node:crypto';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

export const SESSION_COOKIE_NAME = 'pv360_admin_session';
// Idle timeout: a session is valid for this long since its last validated
// request, refreshed on each one — see specs/admin-auth/spec.md
// ("expiración de sesión ... sin actividad").
export const SESSION_IDLE_MINUTES = 60;

/** High-entropy random token — never stored in plaintext, only its hash. */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/** HMAC (keyed by SESSION_SECRET) so a leaked DB alone can't be used to forge a session token. */
export function hashSessionToken(rawToken: string): string {
  return createHmac('sha256', env.SESSION_SECRET).update(rawToken).digest('hex');
}

export async function setSessionCookie(rawToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_IDLE_MINUTES * 60,
  });
}

export async function readSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
