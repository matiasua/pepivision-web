## Context

The home-visit ("Atención a domicilio") feature touches more surface area than a single route — per this turn's impact analysis (Graphify-guided, then verified against the real files), its footprint is:

- Route: `app/domicilio/page.tsx`, `app/domicilio/actions.ts`.
- Navigation: `lib/nav-items.ts` (single shared array — `Header.tsx` and `Footer.tsx` both render from it, so one entry change affects both plus mobile nav).
- Home page: `app/page.tsx` — a benefits card ("Servicio a domicilio") and a floating "A domicilio" badge overlaid on the hero.
- Admin: `app/admin/home-visits/page.tsx`, `components/admin/AdminNav.tsx` entry, `app/admin/requests/` type filter, `components/admin/RequestCard.tsx` label.
- Domain: `modules/home-visit-coverage/` (EnabledComuna CRUD), `modules/requests/service.ts#submitHomeVisit`.
- Emails: `home-visit-customer-confirmation.ts`, `home-visit-business-notification.ts`.
- Tests: `e2e/a11y/public-pages.spec.ts`, `e2e/public/forms.spec.ts`, `e2e/public/navigation.spec.ts`, `tests-integration/home-visit-and-arco.test.ts`.
- Sitemap: **no sitemap generation file exists anywhere in the repo today** (confirmed via search — no `app/sitemap.ts`/`app/robots.ts`) — this is a gap, not a footprint item to remove; noted for whenever `catalog-seo`'s sitemap work lands.

This confirms Graphify's BFS traversal starting points for "home visit / domicilio" were accurate (all files it surfaced were verified to exist with the quoted content), and that the feature's admin/domain layer is more deeply wired than its public presentation layer — supporting a presentation-only flag rather than a deeper code change.

## Goals / Non-Goals

**Goals:**
- A single source of truth (`HOME_VISIT_ENABLED`) that every public touchpoint reads, so there is exactly one place to flip.
- **Fail-closed**: the service is disabled unless the flag is the exact string `true` — absent, empty, `false`, or any invalid value all mean disabled. This ships with the flag **defaulting to `false`**, matching the current business requirement to keep the service disabled — `true` is an explicit, deliberate opt-in, never an accidental default.
- Zero data loss, zero schema change, zero deletion of admin functionality.
- Reversible in both directions: flipping the flag restores the other state with no code revert needed (no rebuild of *removed* code — see the rebuild note below for the separate, unrelated static-generation caveat).

**Non-Goals:**
- Not removing the `EnabledComuna` model, the home-visit-coverage module, or any admin screen.
- Not implementing a generic feature-flag framework — this is one boolean, env-driven, consistent with how the rest of this codebase reads configuration (`lib/env.ts`), not a new abstraction.
- Not building a sitemap (none exists yet) — only documenting that the flag must gate it once `catalog-seo` or an equivalent change introduces one.

## Decisions

### Single flag, fail-closed parsing, read once, threaded through render-time checks

`HOME_VISIT_ENABLED` (`lib/env.ts`) is parsed as `z.string().optional().default('false').transform((v) => v === 'true')` — deliberately **not** `z.enum(['true','false'])` (which would throw a startup error on an invalid value instead of failing closed) and **not** `Boolean(process.env.HOME_VISIT_ENABLED)` (which would treat the string `"false"` as truthy). Only the exact string `"true"` resolves to enabled; every other case — the variable absent, an empty string, `"false"`, or any other value — resolves to `false`, matching the current business requirement that the service ships disabled. `isHomeVisitEnabled()` (`lib/feature-flags.ts`) is the single call site every touchpoint reads through; it is read at render/request time by:
- `app/domicilio/page.tsx` — returns `notFound()` when disabled, before rendering the form.
- `lib/nav-items.ts` — the "Atención a domicilio" entry is conditionally included in the exported array (not filtered downstream in `Header.tsx`/`Footer.tsx`, so both stay simple consumers of "whatever's in the array").
- `app/page.tsx` — the "Servicio a domicilio" benefit card and the "A domicilio" floating badge are conditionally rendered.

### Admin and historical data are explicitly out of scope of the flag

`app/admin/home-visits/`, the `EnabledComuna` CRUD, and the `Request` type filter/labels in the admin inbox are **not** gated by `HOME_VISIT_ENABLED` — an admin must still be able to review historical home-visit requests and manage comuna coverage while the public form is off, per the business requirement to "conservar administración." `modules/requests/service.ts#submitHomeVisit` itself is also not gated at the service layer (only the public route that calls it) — this keeps the domain function usable if the business ever wants to record a home-visit request through another channel while the public form is off.

### Sitemap: documented dependency, not built here

No sitemap exists in this codebase today. When `catalog-seo` (or any future change) introduces `app/sitemap.ts`, it SHALL read `HOME_VISIT_ENABLED` and exclude `/domicilio` when it's `false` — this is recorded as a dependency for that future work, not something this change builds.

## Risks / Trade-offs

- **[Risk]** A flag check missed in one of the touchpoints leaves a dangling link (e.g. nav hidden but the route still directly reachable, or vice versa). → **[Mitigation]** Every touchpoint enumerated in "Context" gets its own task and its own test (see tasks.md) — the checklist is exhaustive, not partial.
- **[Risk]** Disabling the route could break an existing bookmarked link ungracefully. → **[Mitigation]** `notFound()` is the same 404 behavior already used elsewhere in this codebase for unpublished content — consistent, not a new failure mode.
- **[Risk, discovered during implementation]** `/`, `/faq`, and `/domicilio` are statically generated at `next build` time (confirmed via the build output: `○ Static`, not `ƒ Dynamic`) — `isHomeVisitEnabled()` reads a module-scope env value with no dynamic API dependency, so Next.js has no signal to opt these three routes out of static generation. Flipping `HOME_VISIT_ENABLED` and only **restarting** the `web` container does **not** update these three already-generated pages; the image must be **rebuilt** (`docker compose build web`) for their content to reflect the new value. → **[Mitigation, accepted]** The server-side enforcement (`submitHomeVisitAction`) reads the flag per-request and is NOT affected by this — a request is rejected immediately regardless of whether the static pages have been rebuilt yet, so there is no security/data-integrity gap, only a visibility lag on 3 low-traffic pages until the next build. Forcing these routes to `dynamic = 'force-dynamic'` was considered and rejected: doing so for `/faq` alone is straightforward, but doing it for `/` would lose static optimization for the busiest page on the site to solve a problem (avoiding a rebuild) that this project's own deployment model doesn't actually require — every other env-driven behavior in this codebase is already only ever changed by a rebuild+redeploy, per README.md's Docker Compose workflow. Documented in README.md's "Feature flags" section rather than silently discovered by an operator.

## Migration Plan

1. Add `HOME_VISIT_ENABLED` to `lib/env.ts`, fail-closed, defaulting to `false`.
2. Gate the route, nav, and home-page touchpoints.
3. Add tests for both states (enabled/disabled) per touchpoint, plus the fail-closed parsing itself (absent/empty/invalid/`"false"` all → disabled).
4. Ship with the flag defaulting to `false` — the service is disabled from the moment this change lands, matching the current business requirement. Enabling it (`HOME_VISIT_ENABLED=true`) is a separate, explicit, deliberate operational action, not something that happens by omission.
5. **Rollback / re-enable**: setting the flag to `true` restores public availability; unsetting it (or setting it back to `false`) returns to the default disabled state. Either direction is a plain env change with no code revert needed — subject to the rebuild caveat below for the three statically-generated pages.

## Open Questions

- Should disabling `HOME_VISIT_ENABLED` also hide the home-visit `RequestType` option from any future public-facing type selector, or only from the dedicated `/domicilio` route (today, home-visit requests are only ever created via that dedicated route, so this may be moot until a shared multi-type public form exists)?
