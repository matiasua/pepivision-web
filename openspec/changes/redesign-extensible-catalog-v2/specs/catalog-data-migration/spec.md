## ADDED Requirements

### Requirement: Migration preserves all existing data unchanged
The migration to the category/offering model SHALL NOT alter, duplicate, or delete any existing `Product`, `ProductColor`, `ProductImage`, `Brand`, `Request`, `RequestAttachment`, admin user, session, or audit log row, nor any photograph already stored in MinIO.

#### Scenario: Existing products are untouched
- **WHEN** the migration runs against a database with existing visible products, colors, and images
- **THEN** every existing `Product`, `ProductColor`, and `ProductImage` row SHALL remain exactly as it was, with no new duplicate rows created for them

#### Scenario: Existing requests are untouched
- **WHEN** the migration runs against a database with historical `Request` and `RequestAttachment` rows
- **THEN** those rows SHALL remain unchanged, including their `details` JSON content

### Requirement: An Armazones offering is created for every currently-visible product
The migration SHALL create exactly one `ProductOffering` in the Armazones category for each `Product` that is `visible: true` at migration time, using the product's existing `priceFromClp` as the offering's initial `priceFromClp` and the product's existing `slug` as the offering's slug.

#### Scenario: A visible product gets one Armazones offering
- **WHEN** the migration runs for a visible product with `priceFromClp: 19990` and `slug: 'coral'`
- **THEN** exactly one `ProductOffering` SHALL be created with `categoryId` = Armazones, `priceFromClp: 19990`, `slug: 'coral'`, `visible: true`

### Requirement: The migration does not remove or alter the legacy Product.priceFromClp field
The migration SHALL read `Product.priceFromClp` only as the one-time seed value for each product's initial Armazones offering. It SHALL NOT alter, nullify, or drop the `Product.priceFromClp` column — that column remains in a compatibility phase, removed only by a later, separate migration once no code depends on it for public display.

#### Scenario: Product.priceFromClp is left untouched by this migration
- **WHEN** the migration completes
- **THEN** every `Product.priceFromClp` value SHALL be identical to its pre-migration value, and the column SHALL remain non-nullable

#### Scenario: A non-visible product does not automatically receive an offering
- **WHEN** the migration runs for a product with `visible: false`
- **THEN** no `ProductOffering` SHALL be automatically created for that product

### Requirement: Optical and sun-optical offerings are never auto-created
The migration SHALL NOT create Lentes ópticos or Lentes de sol ópticos offerings for any product automatically — enabling those categories for a product SHALL always be an explicit admin action.

#### Scenario: Migration does not assume every frame is opticable
- **WHEN** the migration completes for a catalog of ten visible products
- **THEN** exactly ten Armazones offerings SHALL exist and zero Lentes ópticos or Lentes de sol ópticos offerings SHALL exist, until an admin explicitly creates them

### Requirement: The category seed and migration are idempotent
Running the category seed and the Armazones-offering migration more than once SHALL NOT create duplicate categories or duplicate offerings.

#### Scenario: Re-running the migration is a no-op for already-migrated products
- **WHEN** the migration is run a second time after already creating Armazones offerings for all visible products
- **THEN** the total offering count SHALL remain unchanged

### Requirement: Legacy URLs remain resolvable after migration
Every product URL publicly reachable before the migration SHALL remain reachable after it, via the compatibility redirect described in `catalog-navigation`.

#### Scenario: A pre-migration bookmarked URL still resolves post-migration
- **WHEN** a visitor requests a `/catalogo/[slug]` URL that was valid before the migration
- **THEN** the request SHALL resolve (via redirect) to the equivalent `/catalogo/armazones/[slug]` URL without a broken link
