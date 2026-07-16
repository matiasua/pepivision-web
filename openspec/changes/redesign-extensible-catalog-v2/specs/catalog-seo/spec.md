## ADDED Requirements

### Requirement: Each category has distinct metadata
Every `Category` page (`/catalogo/[categorySlug]`) SHALL render a title and meta description derived from that category's `seoTitle`/`seoDescription` (falling back to `name`/`shortDescription` when unset).

#### Scenario: A category without custom SEO fields falls back sensibly
- **WHEN** a category has no `seoTitle` set
- **THEN** the page SHALL render a title built from the category's `name`, never an empty or generic title

### Requirement: Each offering has its own distinct metadata, avoiding duplicate content
Every `ProductOffering` detail page SHALL render a title and meta description specific to that offering's category context, so the same underlying `Product` appearing in two categories never produces identical `<title>`/description pairs.

#### Scenario: The same product in two categories has two distinct titles
- **WHEN** "Coral" is offered under both Lentes ópticos and Lentes de sol with no custom `seoTitle` set on either offering
- **THEN** the Lentes ópticos offering page's title SHALL include "Lentes ópticos" and the Lentes de sol offering page's title SHALL include "Lentes de sol", producing two distinct titles

### Requirement: Canonical URLs point to the category-scoped offering URL
Every offering detail page SHALL declare a canonical URL equal to its own `/catalogo/[categorySlug]/[offeringSlug]` path — never the legacy `/catalogo/[slug]` path.

#### Scenario: Canonical tag matches the category-scoped URL
- **WHEN** `/catalogo/lentes-opticos/coral` is rendered
- **THEN** its canonical URL SHALL be `/catalogo/lentes-opticos/coral`, not `/catalogo/coral`

### Requirement: Structured data reflects category and price accurately
Offering detail pages SHALL include `BreadcrumbList` structured data reflecting Home → Catálogo → Category → Offering, and `Product`/`Offer` structured data whose price is populated only when `priceFromClp` is non-null.

#### Scenario: An offering without a public price omits the Offer price
- **WHEN** an offering has `priceFromClp: null`
- **THEN** its structured data SHALL omit a numeric offer price rather than emitting a fabricated `0`

### Requirement: Category listing pages include ItemList structured data
Each category's listing page SHALL include `ItemList` structured data enumerating its currently visible offerings.

#### Scenario: ItemList reflects visible offerings only
- **WHEN** a category has both visible and invisible offerings
- **THEN** its `ItemList` structured data SHALL only include the visible ones

### Requirement: Sitemap includes categories, offerings, and legacy redirects
The generated sitemap SHALL include one entry per active/visible `Category`, one entry per active/visible `ProductOffering`, and SHALL NOT list the legacy `/catalogo/[slug]` paths as separate indexable content (since they redirect).

#### Scenario: Sitemap does not create duplicate-content entries
- **WHEN** the sitemap is generated for a product offered in two categories
- **THEN** it SHALL include the two distinct category-scoped offering URLs and SHALL NOT include the legacy product-only URL as a third, separately-indexable entry
