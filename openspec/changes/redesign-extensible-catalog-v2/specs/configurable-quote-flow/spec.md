## ADDED Requirements

### Requirement: The quote wizard begins by selecting a category
The quote flow SHALL first ask which category the customer wants to quote (Lentes ópticos or Lentes de sol), sourced from active/visible `Category` rows, not a hardcoded list.

#### Scenario: Category choice determines the rest of the flow
- **WHEN** a customer selects "Lentes ópticos" as the first step
- **THEN** the subsequent steps SHALL be exactly those enabled by that category's `capabilities`, and the lens-type/treatment/additional-option choices offered SHALL be exactly that category's `quoteOptions` allowlist (see `lens-configuration`)

### Requirement: Wizard steps are derived from category capabilities, not duplicated per category
The system SHALL implement a single, configuration-driven quote wizard component whose active steps are computed by filtering an ordered step list against the selected category's `capabilities` — it SHALL NOT implement separate wizard components per category.

#### Scenario: Lentes ópticos flow shows cristal, tratamientos, opciones adicionales, receta and the prescription attachment
- **WHEN** a customer selects the Lentes ópticos category (`requiresColor`, `allowsLensType`, `allowsTreatments`, `allowsPrescription`, `allowsPrescriptionAttachment`, `allowsFrameSelection` all `true`, `allowsLensTint: false`)
- **THEN** the wizard SHALL show categoría → producto → color → tipo de cristal → tratamientos → opciones adicionales → receta → adjunto de receta → contacto → resumen, and SHALL NOT show a tinte step

#### Scenario: Lentes de sol flow additionally shows tinte and sun-specific options
- **WHEN** a customer selects the Lentes de sol category (all seven capabilities `true`)
- **THEN** the wizard SHALL show categoría → producto → color → tipo de cristal → tinte → tratamientos → opciones adicionales → receta → adjunto de receta → contacto → resumen, and its lens-type step SHALL offer only Lentes de sol's allowed modalities (sin graduación, solar monofocal, solar progresivo) — never Lentes ópticos' Monofocal/Bifocal/Progresivo vocabulary

#### Scenario: Prescription attachment step requires both its capabilities to be true
- **WHEN** a category has `allowsPrescription: false` and `allowsPrescriptionAttachment: true`
- **THEN** the wizard SHALL NOT show the prescription attachment step, since it is only active when both `allowsPrescription` and `allowsPrescriptionAttachment` are `true`

### Requirement: Lens-type, treatment, and additional-option choices are scoped per category, not shown unconditionally
Within the lens-type, treatments, and additional-options steps, the system SHALL only present the specific values allowed for the resolved category's `quoteOptions` (see `lens-configuration`) — never the full code-level catalog regardless of category.

#### Scenario: A Lentes de sol-only option never appears for Lentes ópticos
- **WHEN** a customer is in the Lentes ópticos flow
- **THEN** sun-specific additional options (UV400, polarizado, degradado, espejado, solar graduado) SHALL NOT appear as selectable choices

#### Scenario: The glass-type step uses the definitive terminology
- **WHEN** the lens-type step is rendered for the Lentes ópticos category
- **THEN** its options SHALL read "Monofocal", "Bifocal", and "Progresivo" — the value "Multifocal" SHALL NOT appear in any newly-rendered step or newly-persisted submission

### Requirement: Product/offering selection resolves from an active, visible offering in the chosen category
When a customer selects a specific model, the system SHALL only offer `ProductOffering`s that are `active`, `visible`, and belong to the selected category.

#### Scenario: An offering from a different category is not selectable
- **WHEN** the wizard is scoped to the Lentes ópticos category
- **THEN** offerings that exist only under Lentes de sol SHALL NOT appear in the product selector

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

#### Scenario: A lens-type/treatment/option value outside the category's compatibility allowlist is rejected
- **WHEN** a submission's `glassType`, a `treatments` entry, or an `additionalOptions` entry is not present in the resolved category's `quoteOptions` allowlist (see `lens-configuration`), even though the field itself is capability-enabled
- **THEN** the system SHALL reject the submission with a validation error rather than persisting or emailing the out-of-allowlist value

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
