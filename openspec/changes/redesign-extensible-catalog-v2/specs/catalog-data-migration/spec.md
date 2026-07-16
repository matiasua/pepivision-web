## ADDED Requirements

### Requirement: Migration preserves all existing data unchanged
The migration to the category/offering model SHALL NOT alter, duplicate, or delete any existing `Product`, `ProductColor`, `ProductImage`, `Brand`, `Request`, `RequestAttachment`, admin user, session, or audit log row, nor any photograph already stored in MinIO.

#### Scenario: Existing products are untouched
- **WHEN** the migration runs against a database with existing visible products, colors, and images
- **THEN** every existing `Product`, `ProductColor`, and `ProductImage` row SHALL remain exactly as it was, with no new duplicate rows created for them

#### Scenario: Existing requests are untouched
- **WHEN** the migration runs against a database with historical `Request` and `RequestAttachment` rows
- **THEN** those rows SHALL remain unchanged, including their `details` JSON content

### Requirement: A Lentes ópticos offering is created for every currently-visible product without one
The migration SHALL create exactly one `ProductOffering` in the Lentes ópticos category for each `Product` that is `visible: true` at migration time and has no existing offering in any category, using the product's existing `priceFromClp` as the offering's initial `priceFromClp` and the product's existing `slug` as the offering's slug.

#### Scenario: A visible product with no offerings gets one Lentes ópticos offering
- **WHEN** the migration runs for a visible product with `priceFromClp: 19990`, `slug: 'coral'`, and no existing `ProductOffering`
- **THEN** exactly one `ProductOffering` SHALL be created with `categoryId` = Lentes ópticos, `priceFromClp: 19990`, `slug: 'coral'`, `visible: true`

### Requirement: Existing Armazones offerings are remapped to Lentes ópticos, not duplicated
For an installation that already ran an earlier version of this migration under the prior three-category taxonomy, every existing `ProductOffering` in the `armazones` category SHALL be remapped to the Lentes ópticos category by updating its `categoryId` in place, preserving its `id`, `slug`, `priceFromClp`, `active`, `visible`, and history — except where the same `Product` already has a separate Lentes ópticos offering, which SHALL be flagged for manual admin review rather than merged automatically.

#### Scenario: An Armazones-only offering is remapped in place
- **WHEN** a `Product` has a `visible: true` `ProductOffering` in `armazones` and no offering in `lentes-opticos`
- **THEN** that offering's `categoryId` SHALL be updated to Lentes ópticos, and its `id`, `slug`, `priceFromClp`, and history SHALL remain unchanged

#### Scenario: A product with offerings in both legacy categories is flagged, not auto-merged
- **WHEN** a `Product` already has separate `ProductOffering` rows in both `armazones` and `lentes-opticos` (created manually by an admin before this remap)
- **THEN** the migration SHALL NOT delete or silently merge either row — it SHALL report the conflict for explicit admin resolution

#### Scenario: The Armazones category is removed only once it has zero offerings
- **WHEN** every `ProductOffering` previously in `armazones` has been remapped or resolved
- **THEN** the `armazones` `Category` row SHALL be deleted, reusing the existing "block deletion while offerings exist" safeguard as the pre-deletion check

### Requirement: Lentes de sol ópticos is renamed to Lentes de sol in place, not recreated
The migration SHALL rename the existing `lentes-de-sol-opticos` category's slug to `lentes-de-sol` and its name to "Lentes de sol" by updating the row in place, without changing its `id` or touching any of its existing `ProductOffering` rows.

#### Scenario: Renaming the category does not affect its offerings
- **WHEN** the `lentes-de-sol-opticos` category is renamed to `lentes-de-sol`
- **THEN** every `ProductOffering` already referencing that category's `id` SHALL continue to resolve correctly with no data change required on the offering rows themselves

### Requirement: The migration does not remove or alter the legacy Product.priceFromClp field
The migration SHALL read `Product.priceFromClp` only as the one-time seed value for each product's initial Lentes ópticos offering. It SHALL NOT alter, nullify, or drop the `Product.priceFromClp` column — that column remains in a compatibility phase, removed only by a later, separate migration once no code depends on it for public display.

#### Scenario: Product.priceFromClp is left untouched by this migration
- **WHEN** the migration completes
- **THEN** every `Product.priceFromClp` value SHALL be identical to its pre-migration value, and the column SHALL remain non-nullable

#### Scenario: A non-visible product does not automatically receive an offering
- **WHEN** the migration runs for a product with `visible: false`
- **THEN** no `ProductOffering` SHALL be automatically created for that product

### Requirement: Lentes de sol offerings are never auto-created
The migration SHALL NOT create Lentes de sol offerings for any product automatically — enabling that category for a product SHALL always be an explicit admin action. (Lentes ópticos offerings ARE auto-created per the requirement above, since that is where every existing frame's default commercial offer now lives.)

#### Scenario: Migration does not assume every frame is also a sun-lens candidate
- **WHEN** the migration completes for a catalog of ten visible products with no prior offerings
- **THEN** exactly ten Lentes ópticos offerings SHALL exist and zero Lentes de sol offerings SHALL exist, until an admin explicitly creates them

### Requirement: The category seed and migration are idempotent
Running the category seed, the taxonomy remap (armazones → lentes-opticos, lentes-de-sol-opticos → lentes-de-sol), and the Lentes-ópticos-offering backfill more than once SHALL NOT create duplicate categories, duplicate offerings, or re-move an already-remapped offering.

#### Scenario: Re-running the migration is a no-op for already-migrated products
- **WHEN** the migration is run a second time after already creating or remapping offerings for all visible products
- **THEN** the total offering count and every offering's `categoryId` SHALL remain unchanged

### Requirement: Legacy URLs remain resolvable after migration
Every product and offering URL publicly reachable before the migration — including URLs previously scoped to the removed `armazones` category — SHALL remain reachable after it, via the compatibility redirect described in `catalog-navigation`.

#### Scenario: A pre-migration bookmarked URL still resolves post-migration
- **WHEN** a visitor requests a `/catalogo/[slug]` URL that was valid before the migration
- **THEN** the request SHALL resolve (via redirect) to the equivalent `/catalogo/lentes-opticos/[slug]` URL without a broken link

#### Scenario: A URL previously scoped to the removed Armazones category still resolves
- **WHEN** a visitor requests a previously-published `/catalogo/armazones/[offeringSlug]` URL after the Armazones category has been removed
- **THEN** the system SHALL treat it as a legacy URL and resolve it (via the same redirect mechanism as the bare `/catalogo/[slug]` route) to the offering's new `/catalogo/lentes-opticos/[offeringSlug]` location, rather than returning a broken link
