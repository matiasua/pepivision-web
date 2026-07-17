## ADDED Requirements

### Requirement: The catalog presents categories before products
`/catalogo` SHALL present the active, visible categories (from `Category`, ordered by `sortOrder`) as the primary navigation, before any product listing is shown.

#### Scenario: The category picker reflects the database, not hardcoded JSX
- **WHEN** a SUPERADMIN adds a fourth active, visible category
- **THEN** `/catalogo` SHALL display four categories without any component code change

#### Scenario: An inactive or invisible category is absent from the picker
- **WHEN** a category has `active: false` or `visible: false`
- **THEN** it SHALL NOT appear in the `/catalogo` category picker

### Requirement: Category, offering list, and offering detail have distinct routes
The system SHALL serve `/catalogo`, `/catalogo/[categorySlug]`, and `/catalogo/[categorySlug]/[offeringSlug]` as distinct routes for the category picker, the category's offering listing, and a single offering's detail page respectively.

#### Scenario: An offering detail page renders from ProductOffering, not Product directly
- **WHEN** a visitor requests `/catalogo/lentes-opticos/coral`
- **THEN** the page SHALL be built from the `ProductOffering` matching `(categorySlug: 'lentes-opticos', slug: 'coral')`, including its category-specific price and commercial copy

#### Scenario: An unknown category slug returns not-found
- **WHEN** a visitor requests `/catalogo/categoria-inexistente` — a slug that was never a category and is not one of the reserved legacy category slugs described below
- **THEN** the system SHALL return a not-found response

### Requirement: Retired category slugs redirect permanently to their replacement category — CLOSED, resolves prior ambiguity
`armazones` and `lentes-de-sol-opticos` are retired, reserved category slugs — removed as `Category` rows by the taxonomy migration, but never available for reuse (by a future category or by a `Product.slug`). A bare, single-segment `/catalogo/[categorySlug]` request for one of these two exact slugs SHALL issue a permanent redirect to its replacement category's listing page, resolved via a closed, static, code-level map (`armazones` → `lentes-opticos`, `lentes-de-sol-opticos` → `lentes-de-sol`) — never by querying the database or any visitor-supplied value as a redirect destination. This is a single explicit rule, previously undocumented: the general "unknown category slug returns not-found" requirement above does not apply to these two identifiers, and the 3-segment legacy-offering redirect (below) does not substitute for it — a visitor requesting just the retired category's listing page (no offering segment) still deserves a working destination, not a 404.

#### Scenario: The bare armazones category redirects to lentes-opticos
- **WHEN** a visitor requests `/catalogo/armazones` (no offering segment) after the Armazones category has been removed by the taxonomy migration
- **THEN** the system SHALL issue a permanent redirect to `/catalogo/lentes-opticos`

#### Scenario: The bare lentes-de-sol-opticos category redirects to lentes-de-sol
- **WHEN** a visitor requests `/catalogo/lentes-de-sol-opticos` (no offering segment)
- **THEN** the system SHALL issue a permanent redirect to `/catalogo/lentes-de-sol`

#### Scenario: A retired category slug is resolved before the legacy Product.slug fallback
- **WHEN** `/catalogo/armazones` or `/catalogo/lentes-de-sol-opticos` is requested
- **THEN** the system SHALL resolve it via the closed legacy-category-slug map first, without attempting to look up a `Product` whose `slug` happens to equal that value

#### Scenario: A Product cannot capture a reserved legacy category slug
- **WHEN** a `Product.slug` happens to equal `armazones` or `lentes-de-sol-opticos`
- **THEN** requesting `/catalogo/armazones` or `/catalogo/lentes-de-sol-opticos` SHALL still redirect to the replacement category, never to that product's page — these two identifiers are permanently reserved and unavailable to any `Product.slug` or future `Category.slug`

#### Scenario: The taxonomy migration never recreates the retired categories
- **WHEN** the redirect map resolves `armazones` or `lentes-de-sol-opticos`
- **THEN** the system SHALL NOT create, restore, or reference a `Category` row with either retired slug — the map is a pure code-level redirect, not a database lookup

### Requirement: Legacy product URLs redirect permanently to their category-scoped URL
`/catalogo/[slug]` (the pre-existing product-detail route) SHALL remain resolvable and SHALL issue a permanent redirect to the corresponding `/catalogo/[categorySlug]/[offeringSlug]` URL.

#### Scenario: An old bookmarked product URL still works
- **WHEN** a visitor requests `/catalogo/coral` (the legacy route) for a product whose default offering is Lentes ópticos
- **THEN** the system SHALL issue a permanent redirect to `/catalogo/lentes-opticos/coral`

#### Scenario: A URL scoped to the removed Armazones category still resolves
- **WHEN** a visitor requests `/catalogo/armazones/coral` after the Armazones category has been removed by the taxonomy migration
- **THEN** the system SHALL treat `armazones/coral` as a legacy reference, resolve the underlying offering's new category-scoped URL, and issue a permanent redirect to it rather than returning a broken link

#### Scenario: A product with no visible offering still 404s
- **WHEN** `/catalogo/[slug]` is requested for a product that has no `visible: true` offering in any category
- **THEN** the system SHALL return a not-found response, matching today's behavior for an unpublished product

### Requirement: Offering cards show category-appropriate information and CTA
Each offering card SHALL display cover image, brand, model name, category, price-from (or "Cotizar"), available colors, availability, badges, and a category-appropriate call-to-action label.

#### Scenario: CTA label matches the category
- **WHEN** an offering card is rendered for the Lentes de sol category
- **THEN** its call-to-action SHALL read "Configurar lentes de sol" rather than a generic or Lentes-ópticos-specific label

### Requirement: Offering detail links to the product's other categories
The offering detail page SHALL show which other categories the same underlying `Product` is offered in, with links to those offerings.

#### Scenario: Cross-category availability is shown
- **WHEN** "Coral" is offered as both Lentes ópticos and Lentes de sol
- **THEN** the Lentes ópticos offering detail page SHALL show a link to the Lentes de sol offering for the same product, and vice versa

### Requirement: Empty and loading states are handled per category
A category with zero matching offerings (due to filters or genuinely having no products) SHALL show a clear empty state rather than an error or a blank page.

#### Scenario: No results after filtering shows an empty state
- **WHEN** applied filters within a category match zero offerings
- **THEN** the system SHALL render an empty-state message and SHALL NOT show a server error

### Requirement: Catalog navigation is responsive across breakpoints
The category picker, offering listing, and offering detail SHALL render correctly on mobile, tablet, and desktop breakpoints, including a working mobile filter drawer.

#### Scenario: Mobile visitor can browse and filter
- **WHEN** a visitor on a mobile-width viewport opens the filter drawer on a category listing
- **THEN** all applicable common and dynamic filters SHALL be usable within the drawer, matching desktop functionality
