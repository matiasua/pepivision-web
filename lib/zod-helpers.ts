import { z } from 'zod';

/**
 * Wraps a schema so an empty string is always treated as "not provided"
 * (-> undefined), regardless of what the inner schema would otherwise
 * accept. Needed because `.optional().or(z.literal('').transform(...))`
 * silently keeps '' whenever the inner schema doesn't itself reject an
 * empty string (e.g. plain `z.string().max(n)` has no reason to reject
 * '' on its own) — the `.or()` alternative is only reached when the first
 * branch fails, so it never fires in that case.
 */
export function optionalNonEmpty<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => (value === '' ? undefined : value), schema.optional());
}
