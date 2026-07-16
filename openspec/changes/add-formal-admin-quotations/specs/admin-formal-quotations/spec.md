## ADDED Requirements

### Requirement: Formal quotations are numbered, dated commercial documents
Every issued `AdminQuotation` SHALL have a unique number in the format `COT-{año}-{correlativo de 6 dígitos}`, assigned atomically at issuance, never reused even if the quotation is later voided.

#### Scenario: Two concurrent issuances never collide
- **WHEN** two quotations are issued at nearly the same time
- **THEN** each SHALL receive a distinct, sequential number

#### Scenario: A voided quotation's number is not reused
- **WHEN** a quotation is voided after issuance
- **THEN** its number SHALL remain permanently assigned to it and SHALL NOT be assigned to any other quotation

### Requirement: An issued quotation's commercial content is immutable
Once a quotation transitions from `DRAFT` to `ISSUED`, its line items, quantities, prices, discounts, and totals SHALL NOT be editable — any further change requires creating a new draft.

#### Scenario: Editing an issued quotation's line item is rejected
- **WHEN** an admin attempts to modify a line item on a quotation whose status is not `DRAFT`
- **THEN** the system SHALL reject the edit

### Requirement: Line items may reference a cataloged offering or be entered manually
An `AdminQuotationLineItem` MAY reference a `ProductOffering`, in which case its unit price SHALL be read from `ProductOffering.priceFromClp` at the time the line is added — never from `Product.priceFromClp`. A line item with no offering reference SHALL accept a manually entered unit price.

#### Scenario: A catalog-linked line uses the offering's price
- **WHEN** an admin adds a line item referencing a `ProductOffering` with `priceFromClp: 45000`
- **THEN** the line's `unitPriceClp` SHALL be set to `45000` at that moment

#### Scenario: A later catalog price change does not alter an issued quotation
- **WHEN** the referenced `ProductOffering.priceFromClp` changes after the quotation has been issued
- **THEN** the already-issued quotation's line item price and totals SHALL remain unchanged

#### Scenario: A manual line item does not require a catalog reference
- **WHEN** an admin adds a line item with no `productOfferingId` and a manually entered price
- **THEN** the system SHALL accept it without requiring any catalog lookup

### Requirement: The generated PDF is stored privately and accessed only via a signed URL
The PDF generated at issuance SHALL be stored in the private object-storage bucket and SHALL be downloadable only via a short-lived signed URL issued after verifying the requesting admin's session and role — never via a public, permanent path.

#### Scenario: An unauthenticated request cannot fetch the PDF
- **WHEN** a request for a quotation's PDF is made without a valid admin session
- **THEN** the system SHALL reject the request rather than returning a signed URL or the file

### Requirement: Every status transition is audit-logged
The system SHALL record an audit log entry for every `AdminQuotation` status transition, with actor id, action, target id, and minimal metadata.

#### Scenario: Issuing a quotation is logged
- **WHEN** an admin transitions a quotation from `DRAFT` to `ISSUED`
- **THEN** an audit log entry recording that transition, the acting admin's id, and the quotation's id SHALL be created

### Requirement: ADMIN and SUPERADMIN may both manage the quotation lifecycle
Creating, editing (while in `DRAFT`), issuing, and progressing an `AdminQuotation` through its lifecycle SHALL be permitted for any active admin (`ADMIN` or `SUPERADMIN`), consistent with the trust level already given to `ProductOffering` management.

#### Scenario: An ADMIN issues a quotation
- **WHEN** a user with the `ADMIN` role issues a draft quotation
- **THEN** the operation SHALL succeed and be recorded in the audit log with that admin's id
