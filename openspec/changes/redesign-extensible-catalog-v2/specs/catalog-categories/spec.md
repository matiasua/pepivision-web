## ADDED Requirements

### Requirement: Category is a data-driven entity, not a Prisma enum
The system SHALL model commercial categories as rows in a `Category` table, never as a Prisma enum or other closed, code-level set — adding a new basic category SHALL NOT require a database migration.

#### Scenario: Creating a new category requires no migration
- **WHEN** a SUPERADMIN creates a category named "Lentes deportivos" from `/admin/categories` using only existing capability flags and attribute types
- **THEN** the category becomes usable across the public catalog, admin product form, and quote wizard without any Prisma schema migration, enum change, or code deployment

### Requirement: Idempotent seed of the three initial categories
The system SHALL seed exactly three initial categories — Armazones, Lentes ópticos, Lentes de sol ópticos — via an idempotent upsert-by-slug operation.

#### Scenario: Seed runs twice without duplicating categories
- **WHEN** the category seed script runs a second time against a database that already has the three initial categories
- **THEN** the category count remains exactly three, and no existing category's `id` changes

### Requirement: Category capabilities are validated and typed
Each `Category` SHALL declare its commercial capabilities (`requiresColor`, `allowsLensType`, `allowsTreatments`, `allowsPrescription`, `allowsPrescriptionAttachment`, `allowsLensTint`, `allowsFrameSelection`) as a JSON value validated against a fixed Zod schema, never as scattered conditionals keyed on category name or slug. `allowsPrescriptionAttachment` SHALL only have an observable effect when `allowsPrescription` is also `true`.

#### Scenario: Capabilities are validated on write
- **WHEN** a SUPERADMIN submits category capabilities missing a required boolean field or containing an unknown key
- **THEN** the system SHALL reject the write with a validation error and SHALL NOT persist the malformed capabilities

#### Scenario: Malformed stored capabilities fail closed
- **WHEN** a `Category.capabilities` JSON value somehow fails schema validation on read
- **THEN** the system SHALL treat the category as having no optional capabilities enabled (fail closed) rather than throwing an error on a public page

### Requirement: Category slug uniqueness and normalization
`Category.slug` SHALL be unique and derived via the same normalization approach already used for `Brand.slug` (kebab-case, ASCII, deduplicated), independent of the display `name`.

#### Scenario: Duplicate category name is rejected
- **WHEN** a SUPERADMIN attempts to create a second category whose normalized slug matches an existing category's slug
- **THEN** the system SHALL reject the creation with a validation error identifying the conflict

### Requirement: Categories with offerings cannot be silently deleted
The system SHALL block deletion of a `Category` that has one or more associated `ProductOffering` rows, and SHALL offer deactivation as the recommended alternative.

#### Scenario: Deleting a category with offerings is blocked
- **WHEN** a SUPERADMIN attempts to delete a category that has at least one `ProductOffering`
- **THEN** the system SHALL reject the deletion, report the number of associated offerings, and leave the category and its offerings unchanged

#### Scenario: Deactivating a category hides it without deleting data
- **WHEN** a SUPERADMIN sets a category's `active` flag to false
- **THEN** the category SHALL stop appearing in the public catalog and quote wizard, while its row and all associated offerings remain in the database unchanged

### Requirement: Category ordering and visibility are independent of activity
`Category` SHALL expose independent `active`, `visible`, and `sortOrder` fields, matching the existing `available`/`visible` separation already used on `Product`.

#### Scenario: An active but not-visible category is hidden from the public catalog
- **WHEN** a category has `active: true` and `visible: false`
- **THEN** the public `/catalogo` category picker SHALL NOT list it, while admin screens SHALL still allow managing it
