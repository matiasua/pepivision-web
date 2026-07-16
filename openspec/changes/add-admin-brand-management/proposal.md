## Why

`Brand` already exists as a full Prisma model (`name`, `slug`, `logoPath`, `active`, `sortOrder`) and is already used for product-brand assignment and the public catalog's brand filter — but it has **no admin CRUD at all**: the only code that creates or updates a `Brand` row today is integration-test setup calling Prisma directly. Meanwhile, the home page's brand carousel is entirely disconnected from that table — it scans the `public/marcas/` filesystem directory at request time (`lib/brands.ts#getBrandLogos`) and has no `active`/`sortOrder` semantics, no admin control, and no relationship to the `Brand` rows used everywhere else. Adding or changing a carousel logo today means an engineer manually dropping a file into `public/`, not an admin action.

## What Changes

- Add `/admin/brands`: create, edit (name, logo), toggle active, reorder, and delete-when-unreferenced for `Brand`.
- Add logo upload (JPG/JPEG/PNG, MIME-validated, processed, stored in the public bucket) replacing the current filesystem-drop convention.
- Switch the home-page carousel (`getBrandLogos()`) to read from the `Brand` table (`active: true`, ordered by `sortOrder`) instead of scanning `public/marcas/` — a brand's carousel visibility becomes an admin toggle, not a filesystem operation.
- Add a `carouselVisible` (or reuse `active`, see design.md) control so a brand can be assigned to products without necessarily appearing in the home carousel, if the business wants that distinction — closed in design.md.
- Audit every brand mutation, and gate structural changes appropriately (see design.md → "Autorización").

## Capabilities

### New Capabilities
- `admin-brand-management`: `/admin/brands` CRUD, logo upload pipeline, deletion-when-unreferenced, audit logging, and the home-carousel's switch from filesystem-scan to `Brand`-table-driven rendering.

### Modified Capabilities
- None in `openspec/specs/` — no existing archived capability describes brand administration or the carousel's data source; this is net-new admin surface area on top of the already-shipped `Brand` model and `product-management` capability (read-only brand assignment, unchanged).

## Impact

- **`lib/brands.ts`**: `getBrandLogos()` changes its data source from `readdirSync('public/marcas')` to a `prisma.brand.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } })`-equivalent query — a real behavior change for how the carousel is populated (existing files in `public/marcas/` stop being the source of truth for carousel display).
- **New `app/admin/brands/`** routes, actions, and admin-nav entry, mirroring the existing `/admin/categories` UX pattern (list/create/edit/reorder/toggle-active).
- **`modules/storage/`**: reused as-is for logo upload (public bucket), same pattern as product photos and category images (`add-formal-admin-quotations`/`redesign-extensible-catalog-v2` are unrelated to this reuse — it's the same existing pipeline, no new dependency between changes).
- **No impact** to: `Product`/`ProductColor`/`ProductImage`, the public catalog's existing brand filter (`listActiveBrandsForAdmin`, `listBrandsWithPublicOfferingsInCategory` — unchanged reads), authentication/session model.
