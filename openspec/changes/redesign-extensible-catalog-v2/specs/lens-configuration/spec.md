## ADDED Requirements

### Requirement: Lens types, treatments, and additional options are a fixed, code-known catalog, not admin-extensible
The system SHALL model lens types, treatments, and additional options as a small, fixed, versioned code-level catalog (`LENS_TYPES`, `TREATMENTS`, `ADDITIONAL_OPTIONS`), validated by Zod at every boundary — never as a generic, admin-editable EAV system, since this content originates from fixed business decisions, not variable per-category data.

#### Scenario: The lens-type catalog is exactly three values
- **WHEN** any part of the system reads the lens-type catalog
- **THEN** it SHALL contain exactly `monofocal`, `bifocal`, `progresivo` — no other value SHALL be accepted as a lens type

#### Scenario: "Multifocal" is not a valid lens-type value for new submissions
- **WHEN** a new quote submission or wizard render occurs after this capability is implemented
- **THEN** the value `Multifocal` SHALL NOT appear as a selectable option or be accepted by validation — the equivalent concept SHALL be named `Progresivo`

#### Scenario: A historical record using the retired terminology is not rewritten
- **WHEN** an existing `Request.details` row already contains `glassType: "Multifocal"` from before this renaming
- **THEN** that historical value SHALL remain unchanged and readable in the admin panel — the renaming applies only to new submissions

### Requirement: Each category declares a validated, server-enforced compatibility allowlist
Each `Category` SHALL declare which lens types, treatments, and additional options its quote flow may offer, as a versioned Zod-validated `quoteOptions` structure — distinct from and more specific than the boolean `capabilities` gate, which only controls whether a step exists at all.

#### Scenario: Lentes ópticos allows exactly its defined set
- **WHEN** the Lentes ópticos category's `quoteOptions` is read
- **THEN** its lens types SHALL be exactly Monofocal, Bifocal, Progresivo, and its treatments/options SHALL be exactly Antirreflejo, Filtro de luz azul-violeta, Fotocromático, Protección UV, Mayor resistencia a rayaduras, Hidrofóbico y oleofóbico, and Alto índice

#### Scenario: Lentes de sol allows exactly its defined set
- **WHEN** the Lentes de sol category's `quoteOptions` is read
- **THEN** its lens-type/modality options SHALL be exactly Sin graduación, Solar monofocal, Solar progresivo, and its treatments/options SHALL be exactly UV400, Polarizado, Degradado, Espejado, Solar graduado, Mayor resistencia a rayaduras, and Hidrofóbico y oleofóbico

#### Scenario: A value outside the category's allowlist is never offered or accepted
- **WHEN** the quote wizard renders a lens-type, treatment, or additional-option step for a resolved category
- **THEN** it SHALL only present that category's `quoteOptions` values, and the server SHALL reject any submission containing a value outside that category's allowlist, even if the value exists in the global code-level catalog

### Requirement: Treatment copy never claims absolute scratch resistance
The treatment currently offering scratch resistance SHALL be described as "mayor resistencia a rayaduras" ("greater scratch resistance"); the system SHALL NOT use an absolute claim such as "completamente antirrayas" ("completely scratch-proof") anywhere in its copy.

#### Scenario: Scratch-resistance copy is qualified, not absolute
- **WHEN** the scratch-resistance treatment is displayed anywhere in the public site or a transactional email
- **THEN** its label or description SHALL use "mayor resistencia a rayaduras" and SHALL NOT claim the lens is scratch-proof

### Requirement: The lens-type comparison table is accessible, not color-only
The `/cristales` comparison table (Monofocal / Bifocal / Progresivo) SHALL convey every distinction through text or an accessible marker, never through color alone.

#### Scenario: A screen-reader user can determine each row's value per lens type
- **WHEN** a screen-reader user reaches the comparison table
- **THEN** every cell SHALL expose an unambiguous textual value (e.g. "Sí"/"No") or an icon with an equivalent accessible name, and SHALL NOT rely on a checkmark's color or a background color alone to convey meaning

### Requirement: Additional options are modeled separately from treatments
"Cristales solares graduados" and other structural lens decisions (alto índice, polarizado, degradado, espejado) SHALL be modeled as additional options, distinct from treatments (surface coatings), since they represent a different kind of commercial decision.

#### Scenario: Solares graduados exposes its three variants
- **WHEN** a customer in the Lentes de sol flow selects "cristales solares graduados"
- **THEN** the system SHALL let them choose among solar monofocal, solar progresivo, and polarizado graduado (only when polarized is compatible with the graduated variant chosen), rather than treating "solares graduados" as a single undifferentiated choice
