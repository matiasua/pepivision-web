## ADDED Requirements

### Requirement: Category structure is managed at /admin/categories
The system SHALL provide `/admin/categories` for listing, creating, editing, reordering, and activating/deactivating categories, including slug, description, SEO fields, capabilities, and attribute definitions.

#### Scenario: A new category is fully configurable without code
- **WHEN** a SUPERADMIN creates a category and configures its name, slug, description, capabilities, and attribute definitions from `/admin/categories`
- **THEN** the category SHALL be immediately usable in the public catalog, admin product form, and quote wizard with no additional configuration elsewhere

### Requirement: Only SUPERADMIN may create or modify category structure
Creating, editing, or deleting a `Category` (including its capabilities and attribute definitions) SHALL require the `SUPERADMIN` role.

#### Scenario: An ADMIN cannot alter category structure
- **WHEN** a user with the `ADMIN` role attempts to create or edit a category
- **THEN** the system SHALL reject the request as unauthorized

#### Scenario: A SUPERADMIN can alter category structure
- **WHEN** a user with the `SUPERADMIN` role creates or edits a category
- **THEN** the request SHALL succeed and be recorded in the audit log

### Requirement: Product offerings are managed from within product editing
The product edit screen SHALL include a "Disponibilidad en el catálogo" section allowing an admin to enable the product in one or more categories and configure each `ProductOffering`'s active state, visibility, price-from, commercial title/description, featured flag, sort order, attribute values, and SEO fields, without duplicating colors or photographs.

#### Scenario: Enabling a product in a new category creates one offering
- **WHEN** an admin enables an existing product for the Lentes ópticos category and sets its price-from
- **THEN** the system SHALL create exactly one `ProductOffering` row for that `(product, category)` pair, reusing the product's existing colors and images unchanged

#### Scenario: Disabling a category for a product does not delete the product
- **WHEN** an admin disables (deactivates) a product's offering in one category
- **THEN** the underlying `Product` and its other offerings SHALL remain unaffected

### Requirement: ADMIN may manage product offerings
Any active admin (`ADMIN` or `SUPERADMIN`) SHALL be permitted to create, edit, activate, deactivate, and reorder `ProductOffering`s for a product, since this is routine catalog merchandising work at the same trust level as existing color/image management.

#### Scenario: An ADMIN configures a product's category availability
- **WHEN** a user with the `ADMIN` role enables a product for a category and sets its price
- **THEN** the operation SHALL succeed and be recorded in the audit log with the acting admin's id

### Requirement: Product creation flow separates physical model from commercial offers
The admin product-creation flow SHALL guide the admin through, in order: base model (name, code, brand, colors, photographs), then category selection and per-category offering configuration — visibly distinguishing physical-model data from commercial-offer data.

#### Scenario: A brand-new product can be created without any category selected yet
- **WHEN** an admin creates a new product and saves the base model without enabling any category
- **THEN** the product SHALL be persisted with its colors and photos, and SHALL simply not yet appear in any public catalog category until at least one offering is created

### Requirement: Category images are administrable through an upload pipeline, not a raw path field
`/admin/categories` SHALL let a SUPERADMIN upload, replace, and delete a public cover image for a `Category`, with real MIME validation and an optional WebP output, reusing the same public-bucket storage pattern already used for product photos.

#### Scenario: Uploading a category image validates content, not just the declared type
- **WHEN** a SUPERADMIN uploads a file for a category's cover image
- **THEN** the system SHALL verify the file's actual content matches an accepted image type before storing it, rejecting a mismatched or oversized file rather than trusting the declared `Content-Type`

#### Scenario: A category without an image shows a fallback, never a broken image
- **WHEN** a category has no uploaded image
- **THEN** the public catalog's category card SHALL render a placeholder rather than a broken `<img>` reference

#### Scenario: Replacing or removing a category image is audit-logged
- **WHEN** a SUPERADMIN replaces or removes a category's image
- **THEN** the change SHALL be recorded as part of the existing `category.updated` audit action, with no separate action required

### Requirement: Category and offering mutations are audit-logged
The system SHALL record an audit log entry for `category.created`, `category.updated`, `category.enabled`, `category.disabled`, `category.attributes_updated`, `offering.created`, `offering.updated`, `offering.enabled`, and `offering.disabled`, each with actor id, action, target type/id, and minimal metadata — never secrets, file contents, or full JSON blobs.

#### Scenario: Toggling a category off is logged
- **WHEN** a SUPERADMIN deactivates a category
- **THEN** an audit log entry with action `category.disabled`, the acting admin's id, and the category's id SHALL be created
