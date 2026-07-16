## Context

Verified this turn, directly against the code (Graphify's traversal surfaced the right starting files; every claim below was confirmed by reading them):

- **Customer vs. business differentiation already exists** for quote and home-visit flows: business templates add `Nombre`/`Teléfono`/`Correo` and an admin deep-link button; customer templates omit those and never link into `/admin/*`. This is already correct — nothing to build here.
- **Data-rights (ARCO) has no customer confirmation** — `data-rights-business-notification.ts` is the only template for that flow. Every other request type has both a customer and a business email; this is a genuine, real asymmetry worth closing.
- **Logo delivery**: `LOGO_URL` is built via `buildEmailAssetUrl()` from `EMAIL_ASSET_BASE_URL` (falling back to `APP_URL`), always an absolute URL — the code comment explicitly explains why (an email client can't resolve a relative path or an internal Docker hostname). No CID-attachment mechanism exists, and none is needed given the absolute-URL approach already works.
- **Business hours**: already sourced from `BusinessSettings.hoursText` via `getEffectiveBusinessSettings()`, rendered generically by the shared footer (`renderEmailFooter`) — never hardcoded per template. The **current fallback default** (used only when no admin has ever saved settings) is `'Lunes a sábado de 10:00 a 18:00 hrs'` (`lib/site-config.ts`) — a **data value**, not a code defect. If the business wants the schedule to read "Lunes a viernes de 9:00 a 18:00 hrs," that is an `/admin/settings` data entry (or a change to the fallback default), not a plumbing change — the plumbing already correctly threads whatever value is configured into every email.
- **HTML + text always together**, verified via `sendAndLog()` passing both to `nodemailer.sendMail()` — already correct, matches the requirement as stated.
- **No content-level test assertions exist** — `tests-integration/quote-requests.test.ts` and `home-visit-and-arco.test.ts` only assert `emailLogs.length >= 1` and that a Mailpit message with a matching subject line landed; nothing inspects `HTML`/`Text` body content. This is the real gap this change closes, not a template rewrite.

## Goals / Non-Goals

**Goals:**
- Close the ARCO customer-confirmation gap so all three request types (quote, home-visit, data-rights) have symmetric customer/business coverage.
- Add content-level test assertions so a future template regression (missing field, broken escaping, wrong category label) is caught by tests, not just "an email arrived."
- Document the business-hours value as a data responsibility, not a code change — avoid an implementation team hunting for a non-existent hardcoded string.

**Non-Goals:**
- Not rebuilding the customer/business split, the mail-transport abstraction, or the HTML+text delivery — all three are already correct.
- Not adding CID-attachment logo delivery — the absolute-URL approach already satisfies "no localhost, no relative path, no internal endpoint" and needs no further work; CID is documented as an alternative only in case a future email client proves unable to fetch the absolute URL (no evidence of that today).
- Not touching quote/home-visit template *content* beyond what `redesign-extensible-catalog-v2`'s own snapshot work already specifies — see "Dependencias."

## Decisions

### ARCO customer confirmation follows the exact existing template shape

`data-rights-customer-confirmation.ts` mirrors `home-visit-customer-confirmation.ts`'s structure: acknowledges the request, states the right requested, and — per the data-minimization principle already documented for this flow (`design.md` of `add-pepi-vision-360-v1`, "data minimization for ARCO requests") — does **not** echo back the full free-text description the customer submitted (that stays business-only, matching the existing business template's fuller detail).

### Content-level test assertions extend, not replace, the existing arrival checks

Rather than rewrite `tests-integration/*.test.ts`'s Mailpit helper, extend it with a message-detail fetch (Mailpit's `/api/v1/message/{ID}` endpoint returns `HTML`/`Text`) and add assertions for: presence of the customer's chosen category/model (quote), presence of the comuna (home-visit), and — once this exists — presence of the acknowledgment text (ARCO customer confirmation). This keeps the existing arrival-count assertions as a first-line check and adds content as a second line, rather than replacing a working test with a more fragile one.

### Business-hours value is a data decision, documented here, not implemented here

This design does not change `lib/site-config.ts`'s fallback string or force an `/admin/settings` update — it documents that whoever operates the deployed instance should configure `hoursText` to the business's actual schedule (e.g. "Lunes a viernes de 9:00 a 18:00 hrs," per the business's stated preference this turn) via `/admin/settings`, which is already the correct, working path for that value to reach every email.

## Risks / Trade-offs

- **[Risk]** Content-level assertions on rendered HTML could become brittle if templates are restyled often. → **[Mitigation]** Assert on presence of key text/data (category name, comuna, acknowledgment phrase), not exact HTML structure — consistent with how this codebase already does `escapeHtml`-aware assertions elsewhere.
- **[Risk]** Adding an ARCO customer confirmation could be seen as expanding what a sensitive data-rights request "commits to" in writing. → **[Mitigation]** The confirmation only acknowledges receipt and states the right requested — it does not restate the customer's free-text description, following the same minimization principle already applied to the business-facing template's design rationale.

## Dependencias con `redesign-extensible-catalog-v2`

The quote email templates already show frame/color/glassType/treatments. Once `redesign-extensible-catalog-v2` lands its two-category taxonomy and `request-category-snapshot` extension, those templates will also show category/offering context — that specific content addition is owned by that change (tasks 13.1–13.2 in its `tasks.md`), not duplicated here. This change's scope is content-assurance (tests) and the ARCO gap, both independent of category count.

## Migration Plan

1. Add `data-rights-customer-confirmation.ts` (purely additive — no existing template changed).
2. Wire it into `modules/data-rights/service.ts` alongside the existing business notification send.
3. Extend the Mailpit test helper with message-detail fetching; add content assertions to the quote and home-visit integration tests, and a new test for the ARCO customer confirmation.
4. Document the business-hours data responsibility in `modules/business-settings/README.md` or equivalent.
5. **Rollback**: the new template and its send call are additive; reverting is a plain code revert with no data migration involved.

## Open Questions

- Should the ARCO customer confirmation mention an expected response timeframe? Not specified by the business this turn — needs a business/legal-adjacent decision before implementation (ARCO responses in Chile have statutory timeframes that may need to be reflected accurately).
