import { env } from '@/lib/env';

// Centralized feature-flag reads — server-only (imports lib/env.ts, which
// requires DATABASE_URL/SESSION_SECRET/etc and must never reach a client
// bundle). Never compare `process.env.HOME_VISIT_ENABLED` directly outside
// this module; every call site (route, Server Action, layout) reads the
// flag through this single function so there is exactly one place to
// change how it's derived.
//
// Fail-closed: this returns `true` only when HOME_VISIT_ENABLED is the
// exact string "true" — absent, empty, "false", or any invalid value all
// resolve to `false` (see lib/env.ts). The service ships disabled by
// default; enabling it is an explicit, deliberate operator action, never
// an accidental default.
export function isHomeVisitEnabled(): boolean {
  return env.HOME_VISIT_ENABLED;
}
