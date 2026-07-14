## ADDED Requirements

### Requirement: Common filters apply within a selected category
The public catalog SHALL support the existing common filters (brand, audience/gender, shape, material, color, availability, price range, text search) scoped to the currently selected category, validated with Zod exactly as today.

#### Scenario: Common filters combine with the category scope
- **WHEN** a visitor on `/catalogo/armazones` applies a brand filter and a price-range filter
- **THEN** the result set SHALL only include Armazones offerings matching both filters — no offering from another category SHALL appear

### Requirement: Category-defined attributes are administrable without migration
The system SHALL allow a SUPERADMIN to define new filterable/displayable attributes for a category (`CategoryAttributeDefinition`: key, label, type, required, filterable, visibleInCard, visibleInDetail, options) without a database migration or code deployment.

#### Scenario: A new filterable attribute becomes usable immediately
- **WHEN** a SUPERADMIN adds a `filterable: true` attribute definition (e.g. "certificación") to a category
- **THEN** that category's public filter UI SHALL show a control for it on the next page load, with no code change

### Requirement: Dynamic filter query params are resolved through a per-category allowlist
The system SHALL build the set of accepted dynamic filter query-param keys, for a given request, exclusively from that category's currently `active` and `filterable` `CategoryAttributeDefinition` rows — never from an arbitrary or client-declared key.

#### Scenario: An unknown query parameter is silently dropped
- **WHEN** a request to `/catalogo/lentes-opticos` includes a query parameter whose key does not match any active, filterable attribute definition for that category
- **THEN** the system SHALL ignore that parameter and SHALL NOT use it to construct any database query

#### Scenario: A non-filterable attribute cannot be filtered on
- **WHEN** a category has an attribute definition with `filterable: false`
- **THEN** a query parameter matching that attribute's key SHALL be ignored by the filter system even though the attribute is otherwise valid and displayed

#### Scenario: Filter values are matched by resolved attribute id, not by raw key
- **WHEN** a valid dynamic filter query parameter is accepted
- **THEN** the system SHALL resolve it to its `CategoryAttributeDefinition.id` server-side before querying `ProductOfferingAttributeValue`, and SHALL NOT interpolate the raw browser-supplied key into a Prisma field path

### Requirement: Common and dynamic filters combine correctly
The system SHALL allow common filters and one or more dynamic attribute filters to be applied together in a single request.

#### Scenario: Combined common and dynamic filters narrow the result set
- **WHEN** a visitor filters by brand (common) and by a category-specific "tipo de protección" attribute (dynamic) at the same time
- **THEN** the result set SHALL only include offerings matching both conditions

### Requirement: Filters work on desktop and in the mobile drawer
Both common and dynamic filters SHALL be presented consistently in the desktop filter panel and the mobile filter drawer, and SHALL include a "Limpiar filtros" action that clears both filter types together.

#### Scenario: Clearing filters resets both common and dynamic filters
- **WHEN** a visitor with at least one common filter and one dynamic filter active selects "Limpiar filtros"
- **THEN** all filters SHALL be removed from the URL and the full, unfiltered category listing SHALL be shown

### Requirement: Filtering never causes an unhandled server error
An invalid, malformed, or type-mismatched filter value SHALL be dropped rather than causing a server error.

#### Scenario: A malformed numeric filter value is dropped, not a crash
- **WHEN** a numeric attribute filter is passed a non-numeric string value
- **THEN** the system SHALL ignore that filter value and render the page normally, without the invalid value being applied
