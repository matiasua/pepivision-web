## Why

`add-pepi-vision-360-v1` shipped a single-category catalog. Phases 1–4 of this change (data model, categories, `ProductOffering`, admin CRUD) generalized that into a category/offering model and were implemented against a **three-category taxonomy** (Armazones, Lentes ópticos, Lentes de sol ópticos), and Phase 5 (public catalog) was built and committed against that same three-category assumption.

**The business has since finalized the definitive taxonomy, and it is not three categories — it is two**: **Lentes ópticos** and **Lentes de sol**. `Armazones` is retired as a category; a frame is now a physical `Product` selectable *within* Lentes ópticos, not a commercial category of its own. `Lentes de sol ópticos` is renamed/merged into `Lentes de sol`, which covers both non-prescription and graduated sun lenses. This is a requirements correction that arrived after Phase 5 was implemented and committed (`42f3f35 feat: add category-based public catalog`) — it is **not** a defect in that work, but it does mean Phase 5's category-count assumption, several hardcoded three-way mappings, and the still-unimplemented Phases 6–10 all need to be replanned before implementation continues.

This proposal also formalizes content the business has provided but that was never structurally represented: the definitive lens-type names (Monofocales/Bifocales/**Progresivos** — replacing "Multifocales"), the treatments and additional-options catalogs, and a per-category compatibility matrix the quote wizard must enforce server-side. None of this is implemented in this pass — this is documentation-only replanning, per the standing rule that implementation requires an explicitly approved OpenSpec change.

## What Changes

- **BREAKING (taxonomy):** the catalog's category set becomes exactly **Lentes ópticos** and **Lentes de sol** — `Armazones` and `Lentes de sol ópticos` are removed as categories. A currently-existing `armazones` `ProductOffering` becomes a `lentes-opticos` offering for the same product (remapped, not duplicated); `lentes-de-sol-opticos` is renamed to `lentes-de-sol` in place.
- **BREAKING (terminology):** the glass-type value `Multifocal` is renamed to `Progresivo` everywhere it is user-facing or persisted as a new value going forward (wizard copy, `/cristales`, FAQ, comparison table, CTAs, specs). Historical `Request.details` snapshots already containing the string `"Multifocal"` are immutable records of what was true at submission time and are **not** rewritten.
- Reduce `Category.capabilities` from a boolean-only gate to also carry a **structured, versioned, per-category allowlist** of which lens types, treatments, and additional options that category's quote wizard may offer — validated server-side, never trusted from the client, and never re-derived from a generic admin-editable EAV system (the lens-type/treatment/option catalog itself is fixed business content, not admin-extensible).
- Add **category images**: `Category.imagePath` already exists as a column but has no upload pipeline — add one (upload/replace/delete/preview, MIME-validated, optional WebP output, public bucket), reusing the existing product-image storage pattern.
- Rework the legacy-URL redirect's "default category" heuristic (currently hardcoded to prefer `armazones`, which will no longer exist) and the CTA-label map (currently hardcoded to the three old category slugs).
- Continue Phases 6–10 (dynamic filters, configurable quote wizard, request snapshot, SEO, migration/backfill, final validation) — previously designed against three categories, now redesigned against two, with the wizard additionally gated by the new compatibility matrix, not just the boolean capability flags.
- Reopen and correct the specific Phase 5 items that assumed three categories (see "Fase 5 — evaluación contra la nueva taxonomía" in design.md); the offering-centric architecture Phase 5 built (routes, "también disponible como," responsive/empty states) is **not** discarded — only the category-count-dependent parts are.

## Capabilities

### New Capabilities
- `lens-configuration`: the definitive, code-known catalog of lens types (Monofocal/Bifocal/Progresivo), treatments, and additional options; the accessible comparison table; and the per-category compatibility allowlist the quote wizard and its server-side validation must enforce.

### Modified Capabilities
- `catalog-categories`: the seeded category set changes from three to two; capabilities gain the compatibility-allowlist fields described in `lens-configuration`; category image upload is added.
- `catalog-navigation`: CTA-label map and legacy-redirect default-category logic updated for the two-category set.
- `catalog-administration`: category edit screen gains image upload; capability/compatibility editing reflects the new fields.
- `catalog-data-migration`: the migration is no longer purely additive — it must remap existing `armazones` offerings into `lentes-opticos` and rename the `lentes-de-sol-opticos` slug, in addition to the original create-Armazones-offering backfill (which no longer applies as originally written).
- `configurable-quote-flow`: steps are gated by the new compatibility matrix (which specific lens types/treatments/options apply), not only by the boolean capability flags; "Multifocal" becomes "Progresivo."
- `request-category-snapshot`: snapshot fields are unchanged in shape, but the categories and lens-type vocabulary they capture reflect the two-category taxonomy and the Progresivo renaming.
- `catalog-seo`: sitemap/canonical entries reflect the two-category slug set.

## Impact

- **Prisma schema** (design only, no migration run): `Category.capabilities` JSON gains new validated keys (see design.md → "Compatibilidades del cotizador"); no new tables required for the fixed lens-type/treatment/option catalog (modeled as code-level constants, not new rows) — only the per-category allowlist is data.
- **`prisma/seed.ts`**: category seed rewritten to two rows; existing deployments' `armazones` category/offerings require a remap step (see design.md → "Migración de datos: dos categorías"), not a fresh seed.
- **`modules/catalog/labels.ts`, `modules/catalog/offering-repository.ts`**: CTA-label map and legacy-redirect default-category logic, both currently hardcoded to `armazones`.
- **`modules/requests/schemas.ts`, `components/quote/QuoteWizard.tsx`**: `GLASS_TYPES` renamed value, wizard steps gated by the new compatibility matrix, additional-options step added.
- **`modules/notifications/email/templates/quote-*.ts`, `e2e/`, `docs/page-inventory.md`, `openspec/specs/public-site/spec.md`** (baseline, not edited by this change): every exhaustive "Multifocal" occurrence identified this turn (see design.md) is a future implementation touchpoint, not touched now.
- **No impact** to: authentication/session model, image storage strategy (MinIO bucket split, reused as-is for category images), `Product`/`ProductColor`/`ProductImage`/`Brand` schemas, retention/audit mechanisms, `ProductOffering`'s core model (unique constraints, soft delete, price-compatibility phase) — all reused exactly as already designed and implemented in Phases 1–4.
