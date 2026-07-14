## ADDED Requirements

### Requirement: The quote wizard begins by selecting a category
The quote flow SHALL first ask which category the customer wants to quote (e.g. Armazón, Lentes ópticos, Lentes de sol ópticos), sourced from active/visible `Category` rows, not a hardcoded list.

#### Scenario: Category choice determines the rest of the flow
- **WHEN** a customer selects "Lentes ópticos" as the first step
- **THEN** the subsequent steps SHALL be exactly those enabled by that category's `capabilities`

### Requirement: Wizard steps are derived from category capabilities, not duplicated per category
The system SHALL implement a single, configuration-driven quote wizard component whose active steps are computed by filtering an ordered step list against the selected category's `capabilities` — it SHALL NOT implement separate wizard components per category.

#### Scenario: Armazón flow shows only the applicable steps
- **WHEN** a customer selects the Armazones category (`requiresColor: true`, `allowsFrameSelection: true`, all other capabilities `false`)
- **THEN** the wizard SHALL show category → producto → color → contacto → resumen, and SHALL NOT show cristal, tratamientos, tinte, receta, or adjunto de receta steps

#### Scenario: Lentes ópticos flow shows cristal, tratamientos, receta and the prescription attachment
- **WHEN** a customer selects the Lentes ópticos category (`requiresColor`, `allowsLensType`, `allowsTreatments`, `allowsPrescription`, `allowsPrescriptionAttachment`, `allowsFrameSelection` all `true`, `allowsLensTint: false`)
- **THEN** the wizard SHALL show category → producto → color → tipo de cristal → tratamientos → receta → adjunto de receta → contacto → resumen, and SHALL NOT show a tinte step

#### Scenario: Lentes de sol ópticos flow additionally shows tinte
- **WHEN** a customer selects the Lentes de sol ópticos category (all seven capabilities `true`)
- **THEN** the wizard SHALL show category → producto → color → tipo de cristal → tinte → tratamientos → receta → adjunto de receta → contacto → resumen

#### Scenario: Prescription attachment step requires both its capabilities to be true
- **WHEN** a category has `allowsPrescription: false` and `allowsPrescriptionAttachment: true`
- **THEN** the wizard SHALL NOT show the prescription attachment step, since it is only active when both `allowsPrescription` and `allowsPrescriptionAttachment` are `true`

### Requirement: Product/offering selection resolves from an active, visible offering in the chosen category
When a customer selects a specific model, the system SHALL only offer `ProductOffering`s that are `active`, `visible`, and belong to the selected category.

#### Scenario: An offering from a different category is not selectable
- **WHEN** the wizard is scoped to the Lentes ópticos category
- **THEN** offerings that exist only under Armazones SHALL NOT appear in the product selector

### Requirement: The server re-resolves category, offering, product, brand, and color — never trusts the client
Upon submission, the system SHALL re-resolve `categoryId → Category`, `offeringId → ProductOffering` (verified to belong to that category), `offering.productId → Product`, and `colorId → ProductColor` (verified to belong to that product) directly from PostgreSQL, ignoring any client-sent name, price, or capability claim.

#### Scenario: A tampered category/offering pairing is rejected
- **WHEN** a submission references an `offeringId` that exists but does not belong to the submitted `categoryId`
- **THEN** the system SHALL reject the submission with a validation error and SHALL NOT persist a Request

#### Scenario: A color not belonging to the resolved product is rejected
- **WHEN** a submission references a `productColorId` that exists but belongs to a different `Product` than the one resolved from the offering
- **THEN** the system SHALL reject the submission with a validation error

#### Scenario: A capability the category does not grant is never persisted or emailed
- **WHEN** a submission includes prescription/treatment/tint data for a category whose `capabilities` do not permit that field
- **THEN** the system SHALL ignore that field entirely rather than persisting or emailing it

### Requirement: Invalid or incomplete configuration is rejected before persistence
A submission missing a required field for the resolved category's capabilities (e.g. no color chosen when `requiresColor` is true) SHALL be rejected before any database write.

#### Scenario: Missing a required color is rejected
- **WHEN** a submission for a `requiresColor: true` category omits a color selection
- **THEN** the system SHALL reject the submission with a validation error identifying the missing field

### Requirement: An "advice" path remains available without selecting a specific offering
A customer SHALL be able to request quote assistance without selecting a specific product/offering, within any category.

#### Scenario: Advice path skips product-specific steps
- **WHEN** a customer selects "necesito asesoría" instead of a specific offering
- **THEN** the wizard SHALL skip the color/cristal/tinte/tratamientos steps that depend on a resolved product, while still asking category-appropriate contact/summary questions
