## Why

The existing transactional-email system (`modules/notifications/`) already does more right than wrong — verified this turn: customer/business templates are already differentiated for the quote and home-visit flows (business versions carry phone/email/admin deep-links, customer versions don't), the logo is already an absolute HTTPS URL (never `localhost` or a relative path), and both HTML and plain-text parts are already generated for every email. What's missing is verification depth (no test asserts on actual rendered content — only that *an* email arrived), a documented, explicit correctness statement about the business-hours copy, and a data-rights (ARCO) flow that has no customer-facing confirmation at all. This change closes those specific gaps rather than rebuilding an already-sound system.

## What Changes

- Add content-level test assertions (subject/body presence of key fields) for at least the quote and home-visit templates — today's `tests-integration/*.test.ts` only confirm a Mailpit message arrived, never its content.
- Document and verify the business-hours copy path: `hoursText` already flows from `BusinessSettings` (never hardcoded in a template) — this change's job is to confirm/update the *value* an admin should configure it to, not the plumbing, which is already correct.
- Add a customer-facing confirmation email for data-rights (ARCO) requests — today only a business notification exists for that flow; every other request type (quote, home-visit) has both.
- Document the logo-delivery approach as a closed decision (absolute HTTPS URL, already correct) with a CID-attachment alternative noted for reference only, not required.
- No change to the already-correct customer/business template split, the mail-client abstraction, or the HTML+text-together delivery — these are reused as-is.

## Capabilities

### New Capabilities
- `transactional-email-content-assurance`: content-level test coverage for email templates, the documented business-hours-copy responsibility, and the new ARCO customer confirmation.

### Modified Capabilities
- None in `openspec/specs/` — no archived capability currently specifies email *content* assertions or the ARCO flow's customer-facing side; this adds capability that didn't exist as a spec before, on top of the already-implemented (and unspecified-in-baseline) notification system.

## Impact

- **`modules/notifications/email/templates/`**: add `data-rights-customer-confirmation.ts`, following the exact structure of the four existing templates (`{ subject, preheader, html, text }`).
- **`tests-integration/`**: extend Mailpit-based tests to fetch and assert on message content (subject/body), not just arrival — requires extending `MailpitMessageSummary`-equivalent fetch logic to pull a message's `HTML`/`Text` fields from Mailpit's message-detail endpoint.
- **No impact** to: `modules/notifications/client.ts` (mail transport), `modules/notifications/email/layout.ts`/`config.ts` (logo URL, footer), the existing quote/home-visit templates' structure, or `BusinessSettings`'s schema.
- **Dependency**: the part of this change that would show category/offering context in the quote emails (beyond what's already there) depends on `redesign-extensible-catalog-v2` finishing its taxonomy correction and request-snapshot work first — see design.md → "Dependencias."
