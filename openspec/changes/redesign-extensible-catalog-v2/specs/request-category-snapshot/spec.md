## ADDED Requirements

### Requirement: Request.details captures a full category/offering snapshot at submission time
Every quote `Request` SHALL store, inside its existing `details` JSON field, the resolved `categoryId`, `categoryName`, `categorySlug`, `offeringId`, `productId`, `productName`, `productCode`, `brandId`, `brandName`, `productColorId`, `productColorName`, `priceFromSnapshot`, plus the applicable configuration (glass type, treatments, tint, prescription information) — all resolved from PostgreSQL, never taken verbatim from client input.

#### Scenario: A quote submission stores the full snapshot
- **WHEN** a customer submits a quote for a Lentes de sol ópticos offering with a chosen color, glass type, treatments, and tint
- **THEN** the resulting `Request.details` SHALL contain all of categoryId/categoryName/categorySlug/offeringId/productId/productName/productCode/brandId/brandName/productColorId/productColorName/priceFromSnapshot alongside the glass type, treatments, and tint

### Requirement: The stored snapshot is immutable against later catalog edits
Once a `Request.details` snapshot is persisted, it SHALL NOT change when the referenced category, offering, product, or price is later edited, disabled, or deleted.

#### Scenario: Editing an offering's price does not alter historical requests
- **WHEN** an admin changes a `ProductOffering.priceFromClp` after a request already references that offering
- **THEN** the historical request's `priceFromSnapshot` SHALL remain the value that was current at submission time

#### Scenario: Renaming a category does not alter historical requests
- **WHEN** an admin renames a `Category` after a request already references it
- **THEN** the historical request's stored `categoryName` SHALL remain the name that was current at submission time

### Requirement: Transactional emails include category and offering context
The customer confirmation and business notification email templates SHALL include the category, offering/model, brand, color, configuration, and price-from-referencial fields from the snapshot, in both the HTML and plain-text versions.

#### Scenario: Business notification shows the category
- **WHEN** a business notification email is generated for a Lentes ópticos quote
- **THEN** both its HTML and plain-text bodies SHALL display "Lentes ópticos" as the category alongside the model, color, and configuration

#### Scenario: Prescription attachment presence is mentioned without exposing the file
- **WHEN** a quote for a category with `allowsPrescription: true` and `allowsPrescriptionAttachment: true` includes an uploaded prescription
- **THEN** the business notification SHALL state that a prescription is attached and available in the admin panel, and SHALL NOT include the file, its storage key, or any private URL

### Requirement: WhatsApp continuation message includes category context
The WhatsApp deep-link message generated after a quote submission SHALL reference the category and offering/model chosen, consistent with the stored snapshot.

#### Scenario: WhatsApp message reflects the chosen category
- **WHEN** a customer completes a Lentes de sol ópticos quote for a specific model and color
- **THEN** the generated WhatsApp message text SHALL mention the category, model, and color

### Requirement: Admin request inbox can filter by category
The admin requests inbox SHALL support filtering requests by category, alongside the existing type/status/date filters.

#### Scenario: Filtering the inbox by category narrows results
- **WHEN** an admin filters the requests inbox by the Lentes ópticos category
- **THEN** only requests whose stored snapshot's `categorySlug` matches SHALL be shown

### Requirement: No private or sensitive data leaks through the snapshot or notifications
The stored snapshot and generated notifications SHALL never include a prescription file's contents, its storage key, a private signed URL, or any other internal storage detail.

#### Scenario: Request.details never contains a storage key
- **WHEN** a request with an attached prescription is persisted
- **THEN** its `details` JSON SHALL NOT contain the attachment's `storageKey` or any bucket path
