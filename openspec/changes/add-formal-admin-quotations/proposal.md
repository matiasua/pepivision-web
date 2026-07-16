## Why

Today, "cotización" means a customer-submitted `Request` of type `QUOTE`, handled entirely through WhatsApp follow-up — there is no formal, numbered, PDF document the business can issue. The business wants an admin-issued formal quotation: numbered, dated, with line items, totals (net/IVA/total), commercial terms, and a lifecycle (borrador → emitida → enviada → aceptada/rechazada/vencida/anulada) — a distinct commercial document from the informal WhatsApp-driven request flow that already exists and continues unchanged.

## What Changes

- Add a new `AdminQuotation` entity (numbered `COT-AAAA-NNNNNN`, issue date, validity period, customer data, line items with quantity/unit price/discount/net/IVA/total, commercial terms, status) — admin/SUPERADMIN-only, generated from `/admin` (exact route TBD in design.md).
- Add PDF generation (logo, pagination, immutable snapshot of every line item and total at issuance time — editing a line item after issuance creates a new draft/version, never mutates an issued PDF's numbers).
- Store the generated PDF in the **private** bucket (like prescription attachments), accessed only via a signed URL after admin authentication/authorization — never a public path.
- Full audit logging of every quotation state transition.
- Optional (see design.md → Open Questions): sending the PDF by email once issued.

## Capabilities

### New Capabilities
- `admin-formal-quotations`: the `AdminQuotation` entity, its numbering scheme, its state machine, PDF generation, private-bucket storage with signed-URL access, and audit logging.

### Modified Capabilities
- None in `openspec/specs/` — this is an entirely new document type, independent of the existing `quote-requests`/`request-inbox` baseline capabilities, which are unaffected and continue to model the informal WhatsApp-driven flow exactly as today.

## Impact

- **Prisma schema** (design only): new `AdminQuotation`/`AdminQuotationLineItem` models (or equivalent — see design.md), new enum for quotation status.
- **New PDF-generation dependency**: this codebase has no existing PDF-generation code — design.md must select and justify a library/approach.
- **`modules/storage/private-service.ts`**: reused as-is for the generated PDF (same signed-URL pattern already proven for prescription attachments) — no new storage abstraction.
- **Pricing source**: line items MUST be able to reference `ProductOffering.priceFromClp` when a line corresponds to a cataloged offering, but MUST NOT depend on `Product.priceFromClp` as a fallback source of truth (see design.md → "Fuente de precios") — a quotation can also include custom/manual line items with no catalog reference at all (e.g. a service fee), so the model cannot assume every line maps to a `ProductOffering`.
- **No impact** to: the existing `Request`/`quote-requests` flow, WhatsApp handoff, `modules/notifications/` (unless the optional "send by email" task is scoped in), authentication/session model.
