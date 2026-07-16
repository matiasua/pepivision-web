## ADDED Requirements

### Requirement: ProductOffering links a Product to a Category without duplication
The system SHALL represent "this `Product`, offered within this `Category`" as a `ProductOffering` row, reusing the existing `Product`'s colors, images, and brand without copying them.

#### Scenario: The same Product appears in multiple categories
- **WHEN** a `Product` named "Coral" has a `ProductOffering` in the Lentes ópticos category and a second `ProductOffering` in the Lentes de sol category
- **THEN** both offerings SHALL reference the exact same `Product.id`, `ProductColor` rows, and `ProductImage` rows — no color or image row SHALL be duplicated

#### Scenario: A Product not offered in a category is absent from it
- **WHEN** a `Product` has no `ProductOffering` row for the Lentes de sol category
- **THEN** that product SHALL NOT appear anywhere in the Lentes de sol category's public listing

### Requirement: At most one offering per product per category
`ProductOffering` SHALL enforce uniqueness on `(productId, categoryId)` at the database level.

#### Scenario: Duplicate offering creation is rejected
- **WHEN** an admin attempts to create a second `ProductOffering` for a `Product` already offered in the same `Category`
- **THEN** the system SHALL reject the creation with a validation error rather than creating a duplicate row

### Requirement: Price is set per offering, not per product
Each `ProductOffering` SHALL carry its own nullable `priceFromClp`, independent of the underlying `Product`'s base price and independent of the same product's price in any other category.

#### Scenario: The same Product has different prices in different categories
- **WHEN** "Coral" has `priceFromClp = 19990` as a Lentes ópticos offering and `priceFromClp = 39990` as a Lentes de sol offering
- **THEN** the Lentes ópticos catalog page SHALL display "$19.990" and the Lentes de sol catalog page SHALL display "$39.990" for the same underlying product

#### Scenario: An offering without a public price shows "Cotizar"
- **WHEN** a `ProductOffering.priceFromClp` is null
- **THEN** the public catalog and offering detail page SHALL render a "Cotizar" call-to-action instead of a price, and SHALL NOT display "$0" or an empty price

### Requirement: ProductOffering.priceFromClp is the sole public source of truth for price
Every public-facing read of price (catalog listing, offering detail, quote wizard, transactional emails, WhatsApp copy, SEO `Offer` schema) SHALL read `ProductOffering.priceFromClp` exclusively. `Product.priceFromClp` SHALL remain in place only as a legacy compatibility field — used solely as the one-time seed value for a product's initial Lentes ópticos offering — and SHALL NOT be read for any public display once offerings exist.

#### Scenario: Editing the legacy Product price does not change published offering prices
- **WHEN** an admin edits a `Product`'s base `priceFromClp` after its offerings already exist
- **THEN** no existing `ProductOffering.priceFromClp` SHALL change as a result — each offering's price is only ever changed by editing that offering directly

#### Scenario: The legacy field is removed only in a later, separate migration
- **WHEN** every visible `Product` has at least one `ProductOffering` and no code path reads `Product.priceFromClp` for public display
- **THEN** removing the `Product.priceFromClp` column SHALL be handled by a subsequent, separate migration — not as part of this change — so the system never relies on two permanently-diverging price sources

### Requirement: Offering active/visible state is independent per category
`ProductOffering` SHALL expose independent `active` and `visible` flags, distinct from the underlying `Product.visible`.

#### Scenario: An offering can be hidden while the product stays visible elsewhere
- **WHEN** a `Product` is visible with an active Lentes ópticos offering and an inactive Lentes de sol offering
- **THEN** the product SHALL appear under Lentes ópticos and SHALL NOT appear under Lentes de sol

#### Scenario: An invisible offering is excluded from public listings and direct access
- **WHEN** a `ProductOffering.visible` is false
- **THEN** it SHALL be excluded from its category's listing and its detail page SHALL return a not-found response to public visitors

### Requirement: Offering slugs are scoped to their category
`ProductOffering.slug` SHALL be unique within its `categoryId`, not globally, so the same underlying `Product` can reuse its slug across multiple categories.

#### Scenario: The same slug is valid in two different categories
- **WHEN** "Coral" has slug `coral` as both a Lentes ópticos offering and a Lentes de sol offering
- **THEN** both `/catalogo/lentes-opticos/coral` and `/catalogo/lentes-de-sol/coral` SHALL resolve correctly to their respective offerings

### Requirement: Offering ownership is validated server-side before every mutation
The system SHALL verify that a `ProductOffering` referenced by id genuinely belongs to the `Category` and `Product` claimed by the caller before persisting any related mutation (e.g. attribute values, quote submissions).

#### Scenario: An offering id from a different category is rejected
- **WHEN** a request references an offering id that exists but belongs to a different category than the one specified
- **THEN** the system SHALL reject the operation with a validation error rather than silently using the mismatched offering

### Requirement: Offerings are soft-deleted, never hard-deleted while referenced
`ProductOffering` SHALL support a `deletedAt` timestamp; a soft-deleted offering SHALL be excluded from public listings while any historical `Request.details` snapshot referencing it remains unaffected.

#### Scenario: Soft-deleting an offering does not alter historical requests
- **WHEN** an offering referenced by an existing `Request.details` snapshot is soft-deleted
- **THEN** the historical request's stored category/offering/price fields SHALL remain unchanged and readable in the admin panel

### Requirement: ProductOffering.configuration is scoped to non-filterable structured commercial options, validated by a versioned schema
`ProductOffering.configuration` SHALL only store structured commercial options that are specific to one offering and are not filterable/searchable. It SHALL always be validated against a versioned Zod schema and SHALL NOT be treated as arbitrary JSON, a substitute for a stable column, or a substitute for `CategoryAttributeDefinition`.

#### Scenario: A value matching a known attribute definition's concern is rejected from configuration
- **WHEN** an admin attempts to store a value in `configuration` that corresponds to a filterable or displayable concept already representable as a `CategoryAttributeDefinition`
- **THEN** the system SHALL reject it, since that data belongs in `ProductOfferingAttributeValue` instead

#### Scenario: An unrecognized configuration version is rejected
- **WHEN** a `configuration` payload declares a `version` not recognized by the current schema
- **THEN** the system SHALL reject the write rather than persisting the unrecognized shape as-is

#### Scenario: A value duplicating a stable column is rejected
- **WHEN** an admin attempts to store a price value inside `configuration` that duplicates `ProductOffering.priceFromClp`
- **THEN** the system SHALL reject it, since a value already represented by a real column SHALL NOT also live in `configuration`
