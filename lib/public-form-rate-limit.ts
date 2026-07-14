// Per-IP submission throttle for the three anonymous public forms (cotizador,
// domicilio, derechos ARCO) — see design.md → "Controles de seguridad" (Fase 8).
// Reuses the same in-memory sliding-window primitives already used for login
// (lib/rate-limit.ts), just with a policy suited to form spam instead of
// credential brute-forcing: every submission attempt counts (not only
// failures), since the goal here is limiting request volume per visitor,
// not distinguishing wrong-password attempts from correct ones.
import { logger } from './logger';
import { isRateLimited, recordFailure } from './rate-limit';

const PUBLIC_FORM_RATE_LIMIT_MAX = 5;
const PUBLIC_FORM_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export const PUBLIC_FORM_RATE_LIMIT_MESSAGE =
  'Demasiados envíos desde tu conexión. Espera unos minutos antes de volver a intentarlo.';

export type PublicFormKind = 'quote' | 'home_visit' | 'data_rights';

/**
 * Returns true when `ip` has already reached the limit for `formKind` — the
 * caller should stop and show `PUBLIC_FORM_RATE_LIMIT_MESSAGE` without
 * touching the database or sending email. Otherwise records this attempt
 * and returns false.
 */
export function checkPublicFormRateLimit(formKind: PublicFormKind, ip: string | null): boolean {
  const key = `${formKind}:${ip ?? 'unknown'}`;
  if (isRateLimited(key, PUBLIC_FORM_RATE_LIMIT_MAX, PUBLIC_FORM_RATE_LIMIT_WINDOW_MS)) {
    // No form field values here — only the (non-identifying-on-their-own)
    // form kind and IP, consistent with the "no sensitive data in logs" rule.
    logger.warn('public_form.rate_limited', { formKind, ip: ip ?? 'unknown' });
    return true;
  }
  recordFailure(key, PUBLIC_FORM_RATE_LIMIT_WINDOW_MS);
  return false;
}
