## Why

The catalog implemented under `add-pepi-vision-360-v1` models exactly one commercial thing: a frame (`Product`), sold as itself. The business plan calls for the same physical frame to be sellable as three different commercial offers from day one — armazón, lente óptico, lente de sol óptico — and for more categories (lentes de sol sin receta, lentes de seguridad, lentes deportivos, accesorios, cristales, productos para bomberos/paramédicos, etc.) to be addable later. Today, doing that would mean either duplicating `Product` rows per category (tripling colors/images/brand/stock data and breaking the "one armazón, one truth" invariant) or adding a Prisma enum + hardcoded conditionals per category (a schema migration and a JSX/query rewrite for every future category). Neither is acceptable per the business's own constraint: a new *basic* category must be addable from the admin panel with zero migration, zero new enum, and zero duplicated catalog page.

This change designs — but does not implement — the data model, module architecture, and page/flow redesign needed to separate "what a frame physically is" from "how it's commercially offered," before any more category-specific logic gets bolted onto the current single-category catalog.

## What Changes

- Introduce a `Category` model (administrable, no Prisma enum) seeded idempotently with the three initial categories (Armazones, Lentes ópticos, Lentes de sol ópticos), each declaring a typed, Zod-validated `capabilities` configuration (`requiresColor`, `allowsLensType`, `allowsTreatments`, `allowsPrescription`, `allowsPrescriptionAttachment`, `allowsLensTint`, `allowsFrameSelection` — finalized in design.md) instead of scattered `if (category === '...')` conditionals.
- Introduce a `ProductOffering` model representing "this `Product`, offered inside this `Category`" — carrying the category-specific `priceFromClp`, commercial copy, SEO fields, and configuration, so the same `Product` (and its existing colors/images/brand) can appear under multiple categories without duplication. Unique on `(productId, categoryId)` unless design.md finds a concrete reason to relax it.
- Introduce `CategoryAttributeDefinition` (admin-defined, typed, filterable attribute schema per category) and `ProductOfferingAttributeValue` (normalized values per offering) as a bounded, validated alternative to free-form EAV — used for category-specific filters/attributes (tipo de protección, certificación, tinte, etc.) that don't warrant a new Prisma column per category.
- Redesign the public catalog (`/catalogo`) around categories-first navigation: `/catalogo` (category picker) → `/catalogo/[categorySlug]` (offering list + filters) → `/catalogo/[categorySlug]/[offeringSlug]` (offering detail). Keep `/catalogo/[slug]` alive as a permanent-redirect compatibility layer to the frame's default (armazón) offering.
- Redesign the quote wizard (`app/cotizador`) as one configuration-driven flow whose steps are derived from the selected category's `capabilities`, instead of three near-duplicate wizards.
- Extend `Request.details`, the transactional email templates, and the admin request inbox to carry/display category + offering context (never trusting client-sent names/prices — always re-resolved from PostgreSQL at submission time), and to filter requests by category.
- Extend `/admin/products` with a "Disponibilidad en el catálogo" section per product (toggle categories on/off, set per-category price/copy/attributes) and add `/admin/categories`. **Authorization (closed decision)**: only `SUPERADMIN` may create/edit/reorder/activate/deactivate `Category`, its `capabilities`, and `CategoryAttributeDefinition` (dynamic filter structure); `ADMIN` and `SUPERADMIN` may both create/edit `ProductOffering` for existing products — all enforced server-side.
- Define (not run) a data migration: create the three categories, then one `ProductOffering` (category = Armazones) per currently-visible `Product`, using its existing `priceFromClp` as the initial `priceFrom` — explicitly *not* auto-creating óptico/solar offerings for every product without an explicit decision per product.

This is a proposal/design-only change: no Prisma migration is applied, no code is written, and `/opsx:apply` is not run in this pass.

## Capabilities

### New Capabilities
- `catalog-categories`: the `Category` model, its typed capabilities configuration, admin CRUD, and the idempotent seed of the three initial categories.
- `product-offerings`: the `ProductOffering` model linking a `Product` to a `Category` with category-specific price/copy/SEO, plus the "same product, multiple categories, zero duplication" guarantee.
- `dynamic-catalog-filters`: `CategoryAttributeDefinition` / `ProductOfferingAttributeValue`, the allowlist-based query-param filter system, and how common filters (brand/audience/shape/material/color/price/availability) coexist with per-category dynamic filters.
- `catalog-navigation`: the redesigned public `/catalogo` → `/catalogo/[categorySlug]` → `/catalogo/[categorySlug]/[offeringSlug]` experience, cards, offering detail page, and the compatibility redirect from the current `/catalogo/[slug]`.
- `configurable-quote-flow`: the category-capability-driven `app/cotizador` wizard (one implementation, steps derived from configuration, not three parallel components) and its server-side re-resolution of category/offering/product/brand/color.
- `catalog-administration`: `/admin/categories` (structural, SUPERADMIN-only) and the per-product "Disponibilidad en el catálogo" section for managing `ProductOffering`s (ADMIN-permitted, per role split confirmed in design.md).
- `catalog-data-migration`: the idempotent seed/migration strategy — three categories, one Armazones offering per existing visible product, no auto-generated óptico/solar offerings, no duplicated products/colors/images, no altered historical requests.
- `catalog-seo`: per-category and per-offering metadata, canonical URLs, breadcrumbs, sitemap entries, and the redirect strategy that avoids duplicate content across categories for the same underlying product.
- `request-category-snapshot`: the category/offering/price snapshot fields added to `Request.details`, guaranteed immutable after the fact (a later category/offering/price edit must never change a historical request's displayed values), plus the corresponding updates to emails, WhatsApp copy, and the admin request inbox's category filter.

### Modified Capabilities
- None formally, via `openspec/specs/` — that directory is currently empty (see design.md → "Secuencia con `add-pepi-vision-360-v1`"): the frame-only catalog it describes hasn't been archived into `openspec/specs/` yet. This change is designed to supersede/extend that in-flight change's `product-catalog`, `product-management`, and `quote-requests` capabilities once it is archived; design.md documents that sequencing dependency explicitly rather than modeling it as a delta spec that doesn't yet have a base to delta against.
- **Sequencing decision (closed)**: implementation of `redesign-extensible-catalog-v2` SHALL NOT begin until `add-pepi-vision-360-v1` is completed and archived. This proposal does not edit `add-pepi-vision-360-v1`'s own artifacts and does not archive it automatically — that remains a separate, explicit action.

## Impact

- **Prisma schema** (design only, no migration run): new models `Category`, `ProductOffering`, `CategoryAttributeDefinition`, `ProductOfferingAttributeValue`; `Product` gains no required new fields (colors/images/brand stay exactly as-is); `Request.details` (JSON, no schema change) gains new documented keys.
- **`modules/catalog/`**: schemas/repository/service/admin-* need an offering-aware read path (catalog listing becomes "list offerings," not "list products") — detailed in design.md, not implemented here.
- **`app/catalogo/`, `components/catalog/`**: full navigation redesign; existing components (`ProductCard`, `CatalogFilters`, `ProductGallery`, etc.) are extended or replaced — detailed in design.md.
- **`app/cotizador/`, `components/quote/QuoteWizard.tsx`**: replaced by a configuration-driven flow.
- **`modules/requests/`**: `submitQuote` gains category/offering resolution; `Request.details` shape extended (additive, historical rows unaffected since nothing is backfilled).
- **`modules/notifications/email/templates/`**: quote templates gain category/offering fields.
- **`app/admin/products/`, new `app/admin/categories/`**: admin UI additions.
- **No impact** to: authentication/session model, image storage strategy (MinIO buckets), prescription attachment security model, `Brand` model, existing `ProductColor`/`ProductImage` schemas, retention/audit mechanisms — all reused as-is.
