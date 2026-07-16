## ADDED Requirements

### Requirement: Brands are administrable from /admin/brands
The system SHALL provide `/admin/brands` for listing, creating, editing, activating/deactivating, and reordering `Brand` rows, restricted to `SUPERADMIN`.

#### Scenario: A SUPERADMIN creates a new brand with a logo
- **WHEN** a SUPERADMIN creates a brand with a name and uploads a logo image
- **THEN** the brand becomes available for product assignment and, if active, appears in the home-page carousel

#### Scenario: An ADMIN cannot manage brand structure
- **WHEN** a user with the `ADMIN` role attempts to create, edit, or delete a brand
- **THEN** the system SHALL reject the request as unauthorized

### Requirement: Brand logo upload validates real file content
Uploading a brand logo SHALL verify the file's actual content matches an accepted image type, never trusting the declared `Content-Type` alone, using the same validation already applied to product photos.

#### Scenario: A mismatched file is rejected
- **WHEN** a file with a `.png` extension but non-image content is uploaded as a brand logo
- **THEN** the system SHALL reject the upload

### Requirement: A brand referenced by a product cannot be deleted
The system SHALL block deletion of a `Brand` that has one or more associated `Product` rows, offering deactivation as the alternative.

#### Scenario: Deleting a referenced brand is blocked
- **WHEN** a SUPERADMIN attempts to delete a brand assigned to at least one product
- **THEN** the system SHALL reject the deletion and report the number of associated products

#### Scenario: Deactivating a referenced brand does not affect existing products
- **WHEN** a SUPERADMIN deactivates a brand still assigned to existing products
- **THEN** those products SHALL keep their existing brand assignment and display unchanged, while the brand becomes ineligible for new assignments and disappears from the home carousel

### Requirement: The home-page carousel is driven by the Brand table, not a filesystem scan
The home page's brand carousel SHALL render from `Brand` rows where `active: true`, ordered by `sortOrder`, and SHALL NOT derive its contents from scanning a static directory.

#### Scenario: Toggling a brand's active flag changes carousel membership
- **WHEN** a SUPERADMIN toggles a brand's `active` flag from `true` to `false`
- **THEN** that brand's logo SHALL no longer appear in the home-page carousel on the next render, with no code or file-system change required

#### Scenario: Reordering brands changes carousel order
- **WHEN** a SUPERADMIN changes a brand's `sortOrder`
- **THEN** the home-page carousel SHALL reflect the new order on the next render

### Requirement: Brand mutations are audit-logged
The system SHALL record an audit log entry for `brand.created`, `brand.updated`, `brand.enabled`, and `brand.disabled`, each with actor id, action, target id, and minimal metadata.

#### Scenario: Creating a brand is logged
- **WHEN** a SUPERADMIN creates a new brand
- **THEN** an audit log entry with action `brand.created`, the acting admin's id, and the new brand's id SHALL be created
