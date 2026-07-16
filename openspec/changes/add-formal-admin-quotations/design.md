## Context

The current `Request` model (type `QUOTE`) is an *inquiry*, not a commercial document — it captures what the customer wants and hands off to WhatsApp for a human-negotiated close. There is no concept anywhere in this codebase of a numbered, dated, line-itemized commercial document, and no PDF-generation code exists at all (confirmed via search this turn). This change adds that as a distinct, admin-only capability, reusing exactly two things already proven elsewhere in this codebase: the private-bucket/signed-URL pattern (`modules/storage/private-service.ts`, already used for prescription attachments) and the audit-logging shape (`recordAudit()`).

## Goals / Non-Goals

**Goals:**
- A formal, numbered, immutable-once-issued commercial document an admin can generate, track through a status lifecycle, and make available for download via a signed URL.
- Reuse existing storage/audit patterns exactly — no new abstractions for problems this codebase has already solved.
- Keep pricing honest: a line item tied to a cataloged offering reads `ProductOffering.priceFromClp`, never `Product.priceFromClp` as a fallback source of truth (consistent with the price-compatibility discipline already established in `redesign-extensible-catalog-v2`).

**Non-Goals:**
- Not replacing or modifying the existing informal `Request`/WhatsApp quote flow — both coexist; a formal quotation may reference a `Request` for context but is not required to.
- Not building online payment or e-signature — a quotation is a document, not a checkout.
- Not designing automatic quotation generation from a `Request` in this pass (see Open Questions) — this change designs the entity and its lifecycle; auto-generation from an existing request is a plausible follow-up, not assumed here.

## Decisions

### Data model (design sketch, not implemented here)

```prisma
enum AdminQuotationStatus {
  DRAFT
  ISSUED
  SENT
  ACCEPTED
  REJECTED
  EXPIRED
  VOIDED
}

model AdminQuotation {
  id                String               @id @default(cuid())
  number            String               @unique // "COT-2026-000123"
  status            AdminQuotationStatus @default(DRAFT)
  issuedAt          DateTime?
  validUntil        DateTime?
  customerName      String
  customerPhone     String?
  customerEmail     String?
  commercialTerms   String?
  netAmountClp      Int
  ivaAmountClp      Int
  totalAmountClp    Int
  pdfStorageKey     String?              // private bucket, set once issued
  createdById       String
  createdBy         AdminUser            @relation(fields: [createdById], references: [id])
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt

  lineItems AdminQuotationLineItem[]

  @@map("admin_quotations")
}

model AdminQuotationLineItem {
  id                String          @id @default(cuid())
  quotationId       String
  quotation         AdminQuotation  @relation(fields: [quotationId], references: [id], onDelete: Cascade)
  /// Optional — a line item may or may not correspond to a cataloged offering.
  productOfferingId String?
  description       String
  quantity          Int
  unitPriceClp      Int
  discountClp       Int             @default(0)
  sortOrder         Int             @default(0)

  @@map("admin_quotation_line_items")
}
```

### Numbering scheme

`COT-{año emisión}-{correlativo de 6 dígitos}` (e.g. `COT-2026-000123`), assigned atomically at the `DRAFT → ISSUED` transition, never reused even if a quotation is later voided — the correlativo is a monotonically increasing sequence, not reclaimed on void/rejection, so a number always uniquely identifies one document in the business's records.

### Immutability once issued

A quotation's line items, totals, and PDF are frozen at the moment it transitions from `DRAFT` to `ISSUED` — editing an issued quotation's commercial content is not supported; instead, a new `DRAFT` quotation is created (optionally referencing the prior one for context). This mirrors the exact immutability principle already established for `Request.details` snapshots and `ProductOffering` price history in `redesign-extensible-catalog-v2` — a business document, once formally issued, must never silently change under whoever's viewing it.

### PDF generation

No PDF-generation library exists in this codebase today. This design does not lock in a specific package — that is an implementation-time decision — but requires whatever is chosen to run entirely server-side inside the existing Docker Compose `web` service (no new external service dependency), support pagination for a variable number of line items, and embed the business logo via the same absolute-URL-or-bundled-asset approach already used for the email logo (`modules/notifications/email/config.ts#LOGO_URL` is one proven reference point, though a PDF renderer may need a local file path rather than a fetched URL — an implementation detail for whichever task builds this).

### Storage: private bucket, signed URL, same pattern as prescription attachments

`AdminQuotation.pdfStorageKey` lives in the **private** bucket (`PRIVATE_OBJECT_STORAGE_BUCKET`), never the public one — a formal quotation contains customer PII and commercial terms, same sensitivity class as a prescription attachment. Download access is via `getSignedAttachmentUrl()`-equivalent (60-second signed GET, minted only after the requesting admin's session/role is verified) — reusing `modules/storage/private-service.ts` verbatim, not a new storage path.

### Fuente de precios (source of prices)

A line item tied to a cataloged offering (`productOfferingId` set) reads its unit price from `ProductOffering.priceFromClp` at the moment the line is added to a draft — never from `Product.priceFromClp`, consistent with the price-compatibility discipline `redesign-extensible-catalog-v2` established (that field is legacy/seed-only, never a public-or-commercial-document source of truth). A line item with no `productOfferingId` (e.g. a custom service line, a discount line, a non-cataloged item) simply has its own `unitPriceClp` entered directly by the admin — the model does not require every line to resolve to a catalog entity.

### Autorización

`ADMIN` and `SUPERADMIN` may both create and issue quotations — this is routine commercial work, same trust level as managing `ProductOffering`s, not structural taxonomy work. Voiding an already-`SENT`/`ACCEPTED` quotation may warrant a higher bar (see Open Questions).

## Risks / Trade-offs

- **[Risk]** No PDF library exists yet — this is new infrastructure, not a reuse of an existing pattern. → **[Mitigation]** Everything *around* the PDF (storage, signed URL, audit, numbering, immutability) reuses proven patterns; only the rendering step itself is genuinely new, scoping the novel-code surface to one well-isolated concern.
- **[Risk]** A line item's price could drift from the catalog after the quotation is issued (e.g. the offering's price changes later). → **[Mitigation]** Immutability-at-issuance (see "Decisions") means the PDF's numbers are a frozen snapshot, identical in spirit to `Request.details.priceFromSnapshot` — a later catalog price change never alters an already-issued document.
- **[Risk]** Numbering collisions under concurrent issuance. → **[Mitigation]** The correlativo assignment must be a single atomic DB operation (e.g. a Postgres sequence or a serializable transaction), not a read-then-write race — an explicit implementation task, not left implicit.

## Migration Plan

1. Add the new tables (purely additive, no existing table altered).
2. Implement the draft/line-item CRUD and the atomic numbering assignment.
3. Implement PDF generation and private-bucket storage.
4. Implement the status lifecycle and its audit logging.
5. **Rollback**: purely additive tables; a plain code revert leaves them unused with no data-loss risk to any existing entity.

## Open Questions

- Should an issued quotation email itself to the customer automatically, or only on explicit admin action ("enviar")? This proposal assumes explicit action (status `SENT` is a deliberate admin transition, not automatic on `ISSUED`) but needs confirmation.
- Should voiding a `SENT`/`ACCEPTED` quotation require `SUPERADMIN`, given it's a more consequential action than drafting one? Not decided here — default assumption is `ADMIN`-permitted like the rest of the lifecycle, pending explicit business decision.
- Should a formal quotation be linkable/attachable to an existing informal `Request`, so an admin converting a WhatsApp conversation into a formal document doesn't re-type customer data? Plausible follow-up, not designed in this pass.
