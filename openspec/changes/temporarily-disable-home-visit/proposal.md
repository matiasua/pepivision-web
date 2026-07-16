## Why

The business wants the home-visit ("Atención a domicilio") service temporarily unavailable to the public — without deleting the feature, its historical data, or its admin tooling — so it can be re-enabled later with zero rebuild. This is independent of the catalog taxonomy work in `redesign-extensible-catalog-v2` and should ship on its own, since it affects public availability immediately.

## What Changes

- Add a single feature flag (`HOME_VISIT_ENABLED`, env-driven, defaulting to the current always-on behavior until explicitly set) that gates every public-facing touchpoint of the home-visit feature:
  - `/domicilio` returns a not-found response instead of the form when disabled.
  - The nav link ("Atención a domicilio," currently the single source in `lib/nav-items.ts` shared by header, mobile nav, and footer) is omitted when disabled.
  - The home page's "Servicio a domicilio" benefit card and "A domicilio" floating badge are hidden when disabled.
  - Any future sitemap generation (none exists in the codebase today — see `docs/functional-gaps.md`-equivalent finding this turn) must exclude `/domicilio` when disabled, once a sitemap exists.
- **Explicitly preserved, not touched by the flag**: historical `Request` rows of type `HOME_VISIT`, the `EnabledComuna` admin module and its `/admin/home-visits` screen, the `modules/home-visit-coverage/` and relevant `modules/requests/` code, and the home-visit email templates — administrators can still see and manage past requests and comuna coverage while the public entry point is off.
- No data is deleted, migrated, or altered — this is a presentation-layer toggle, reversible by flipping the flag back.

## Capabilities

### New Capabilities
- `home-visit-availability-flag`: the feature flag itself, its effect on every public touchpoint enumerated above, and the guarantee that admin tooling and historical data remain fully accessible regardless of the flag's state.

### Modified Capabilities
- None in `openspec/specs/` — the existing `home-visit-coverage` and `home-visit-requests` baseline capabilities (behavior when the feature is *on*) are unchanged; this only adds an off switch on top.

## Impact

- **`lib/nav-items.ts`**: the single shared array that already drives header, mobile nav, and footer — one conditional entry removes the link from all three at once.
- **`app/domicilio/page.tsx`, `app/domicilio/actions.ts`**: gate the page itself.
- **`app/page.tsx`**: hide the benefit card and floating badge.
- **No impact** to: `modules/home-visit-coverage/`, `app/admin/home-visits/`, `modules/requests/service.ts#submitHomeVisit` (kept working for direct/admin-initiated use if ever needed), email templates, the `Request`/`EnabledComuna` Prisma models, or any historical data.
