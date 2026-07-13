// In-memory sliding-window rate limiter for failed login attempts —
// sufficient for a single-instance dev environment (see design.md →
// "Controles de seguridad"; no Redis). State resets on process restart,
// an accepted trade-off for this scope and a documented future upgrade
// path if the app ever runs with multiple instances.
interface Bucket {
  failures: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

/** True when `key` has exceeded `max` failures within `windowMs`. Does not mutate state. */
export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const bucket = buckets.get(key);
  if (!bucket) return false;
  if (Date.now() - bucket.windowStart >= windowMs) return false;
  return bucket.failures >= max;
}

/** Records one failed attempt, starting a new window if the previous one expired. */
export function recordFailure(key: string, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { failures: 1, windowStart: now });
    return;
  }

  bucket.failures += 1;
}

/** Clears a key's bucket — call after a successful login. */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
