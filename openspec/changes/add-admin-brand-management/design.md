## Context

Verified this turn, directly against the code (not just Graphify's traversal, though its "Brand entity" / "BrandCarousel()" starting points pointed at the right files):

- **`Brand` Prisma model** (`prisma/schema.prisma:91-108`) already has everything a manageable carousel would need: `name` (unique), `slug` (unique), `logoPath` (`String?`, doc-commented "ruta pública bajo /marcas... no una URL externa"), `active` (default `true`), `sortOrder` (default `0`).
- **No admin CRUD exists.** Every `prisma.brand.create/update/deleteMany` call in the repo lives in `tests-integration/*.test.ts` setup code — there is no `app/admin/*brand*` route, no service function to create/rename/reorder/toggle a brand.
- **Two disconnected "brand" mechanisms coexist today:**
  1. The real `Brand` table — read-only from the admin/public side (`listActiveBrandsForAdmin`, `findBrandById` in `modules/catalog/admin-repository.ts`; `listBrandsWithPublicOfferingsInCategory` in `modules/catalog/offering-repository.ts` for the public catalog filter).
  2. `lib/brands.ts#getBrandLogos()` — lists `public/marcas/` at request time via `readdirSync`, sorts alphabetically, derives alt-text from the filename (with a hardcoded override table for a few names). `app/page.tsx` calls this directly and renders `<BrandCarousel logos={brandLogos} />` — `BrandCarousel.tsx` itself is a pure presentational component with no knowledge of the data source.
- **Image pipeline to reuse**: `modules/storage/service.ts` (public bucket) + `lib/image-processing.ts#processProductImage` (MIME-validated via `sharp`, not just declared `Content-Type`) is the exact same pattern `redesign-extensible-catalog-v2`'s category-image work reuses — this change reuses it too, independently (no dependency between the two changes; both just happen to extend the same existing pipeline).

## Goals / Non-Goals

**Goals:**
- One `Brand` table drives both product-brand assignment (existing, unchanged) and the home carousel (new).
- A brand's carousel appearance becomes an admin action (toggle + reorder), not a filesystem operation.
- Reuse the existing image-upload pipeline exactly as already proven for product photos — no new storage abstraction.

**Non-Goals:**
- Not migrating existing `public/marcas/*.png` files automatically into MinIO-backed `Brand.logoPath` values — see "Migration Plan" for the one-time import step this requires (a real, if small, data migration, not purely additive).
- Not changing the public catalog's existing brand filter behavior (`listBrandsWithPublicOfferingsInCategory`) — it already reads from `Brand`, unaffected by this change.
- Not building a generic asset-management system — this is CRUD for one existing model, following the already-established `/admin/categories` pattern.

## Decisions

### Reuse the `/admin/categories` admin-screen shape, not invent a new one

`/admin/brands` mirrors `/admin/categories`'s already-shipped UX: list (name, logo thumbnail, active, sortOrder) → create/edit form → reorder action → toggle-active action → delete blocked while referenced. This keeps the admin's mental model consistent across entities rather than introducing a new pattern for brands specifically.

### `active` gates both product-assignment eligibility and carousel visibility — no second flag

Rather than introduce a separate `carouselVisible` boolean (considered and rejected): `active: false` already means "not eligible for new product assignment" (`listActiveBrandsForAdmin` filters on it) — extending it to also mean "not shown in the carousel" keeps one flag with one meaning, consistent with `Category`/`ProductOffering`'s existing `active`/`visible` split being reserved for cases where the two states are genuinely independent (a category can be structurally active but temporarily hidden — a brand doesn't have an equivalent "temporarily hide from carousel but still assignable" use case evidenced anywhere in this codebase). If that need arises later, a `carouselVisible` field can be added additively.

### Deletion blocked while referenced, mirroring `Category`/`removeProductColor`

A `Brand` referenced by at least one `Product` cannot be deleted — same "blocked with a count, prefer deactivation" pattern already shipped twice in this codebase (`Category` with offerings, `ProductColor` with images).

### Logo upload reuses the public-bucket pipeline verbatim

Storage key pattern: `brands/${brandId}/logo-${random}.${extension}`, same `imageFileMetaSchema` MIME allowlist (JPEG/PNG; WEBP acceptance and processing follows whatever `redesign-extensible-catalog-v2`'s category-image work lands, if it ships first — otherwise this change adds the WebP-output option to the shared processing helper itself, whichever change implements it first).

### Autorización

Brand structure (create/rename/toggle-active/reorder/delete) is **SUPERADMIN-only**, consistent with `Category` structure — a brand is catalog structure, not routine per-product merchandising like a `ProductOffering`. (Open Question below: should ADMIN be allowed to request a brand be added, e.g. via a lighter "suggest" flow? Not designed here — out of scope unless requested.)

## Risks / Trade-offs

- **[Risk]** Switching the carousel's data source is a behavior change for any brand currently only present as a `public/marcas/*.png` file with no corresponding `Brand` row. → **[Mitigation]** See "Migration Plan" — a one-time import step creates `Brand` rows (name derived from the existing filename-to-alt-text override table already in `lib/brands.ts`) for every current file before the switch, so no logo silently disappears from the carousel on deploy.
- **[Risk]** An admin deletes/deactivates a brand still referenced by products, breaking the product's brand display. → **[Mitigation]** Deletion is blocked while referenced (see "Decisions"); deactivation is allowed (mirrors `Category`) but is a deliberate admin choice, not an accidental one — the admin UI shows the reference count before the action.

## Migration Plan

1. Add `/admin/brands` and the logo-upload pipeline (purely additive — no existing table altered).
2. **One-time import**: for every file currently in `public/marcas/` with no matching `Brand.slug`, create a `Brand` row (`name` from the existing alt-text override table or a slugified filename fallback, `logoPath` pointing at a migrated MinIO object, `active: true`, `sortOrder` preserving the current alphabetical order) — this is the one real data-migration step in this change, run once, idempotent by slug.
3. Switch `getBrandLogos()` to read from `Brand` instead of the filesystem.
4. Verify the carousel renders identically (same logos, same order) immediately after the switch, before removing any reliance on `public/marcas/` as a fallback.
5. **Rollback**: revert `getBrandLogos()` to the filesystem-scan implementation; the imported `Brand` rows can remain unused harmlessly (they're additive) or be removed.

## Open Questions

- Should an `ADMIN` (not just `SUPERADMIN`) be allowed to create/edit brands, given it's arguably closer to routine merchandising (like `ProductOffering`) than structural taxonomy (like `Category`)? This design defaults to SUPERADMIN-only for consistency with `Category`, but the business may prefer the lighter split — needs an explicit decision before implementation.
