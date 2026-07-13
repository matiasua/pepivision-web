/**
 * Computes a retention expiry date by adding `months` to `createdAt`.
 * Called once at creation time (not recalculated later) so a future change
 * to the configured retention period never alters existing records — see
 * design.md → "Decisiones de modelado".
 */
export function computeRetentionExpiresAt(createdAt: Date, months: number): Date {
  const expires = new Date(createdAt);
  expires.setMonth(expires.getMonth() + months);
  return expires;
}
