import { z } from 'zod';

// Shared across all three public forms (cotizador, domicilio, ARCO): a
// hidden field a human never fills. Deliberately never rejected by schema
// validation — a filled honeypot must look like a normal successful
// submission to the sender (see design.md → "Controles de seguridad"), so
// callers check `isHoneypotTriggered()` and silently drop the submission
// instead of surfacing a validation error.
export const honeypotSchema = z.string().optional().default('');

/** True when the hidden honeypot field was filled — a human never does this. */
export function isHoneypotTriggered(website: string): boolean {
  return website.trim().length > 0;
}
