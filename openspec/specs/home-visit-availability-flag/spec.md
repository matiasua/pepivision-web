## Purpose

Controla, mediante un único flag de entorno, si la funcionalidad de atención a domicilio es públicamente accesible, sin afectar datos históricos ni herramientas administrativas.

## Requirements

### Requirement: A single flag controls public availability of the home-visit feature, fail-closed
The system SHALL expose one environment-driven flag (`HOME_VISIT_ENABLED`) that controls whether the home-visit feature is publicly reachable. The flag SHALL be fail-closed: the feature SHALL be enabled if and only if the value is the exact string `"true"` — the variable being absent, an empty string, `"false"`, or any other/invalid value SHALL all result in the feature being disabled. The system SHALL NOT derive this value via a loose truthiness coercion (e.g. `Boolean(value)`) that would treat the string `"false"` as enabled.

#### Scenario: The flag defaults to disabled when absent
- **WHEN** `HOME_VISIT_ENABLED` is not set in the environment
- **THEN** the home-visit feature SHALL be disabled

#### Scenario: An empty value is treated as disabled
- **WHEN** `HOME_VISIT_ENABLED` is set to an empty string
- **THEN** the home-visit feature SHALL be disabled

#### Scenario: An invalid value is treated as disabled, not rejected at startup
- **WHEN** `HOME_VISIT_ENABLED` is set to a value other than `"true"` or `"false"`
- **THEN** the home-visit feature SHALL be disabled, and the application SHALL NOT fail to start because of it

#### Scenario: Only the exact string "true" enables the feature
- **WHEN** `HOME_VISIT_ENABLED` is set to the exact string `"true"`
- **THEN** the home-visit feature SHALL be enabled

#### Scenario: The exact string "false" is treated as disabled
- **WHEN** `HOME_VISIT_ENABLED` is set to the exact string `"false"`
- **THEN** the home-visit feature SHALL be disabled

### Requirement: Disabling the flag makes /domicilio return not-found
When `HOME_VISIT_ENABLED` is `false`, the `/domicilio` route SHALL return a not-found response instead of rendering the home-visit form.

#### Scenario: The public route 404s when disabled
- **WHEN** a visitor requests `/domicilio` while `HOME_VISIT_ENABLED` is `false`
- **THEN** the system SHALL return a not-found response

### Requirement: Disabling the flag removes the navigation link everywhere it appears
When `HOME_VISIT_ENABLED` is `false`, the "Atención a domicilio" navigation entry SHALL be absent from the header, mobile navigation, and footer simultaneously, since all three render from the same shared navigation source.

#### Scenario: The nav link disappears from every surface at once
- **WHEN** `HOME_VISIT_ENABLED` is `false`
- **THEN** the header, mobile navigation menu, and footer SHALL all omit the "Atención a domicilio" link

### Requirement: Disabling the flag hides home-page promotional content for the feature
When `HOME_VISIT_ENABLED` is `false`, the home page's "Servicio a domicilio" benefit card and its "A domicilio" floating badge SHALL NOT be rendered.

#### Scenario: Home-page promotional elements are hidden when disabled
- **WHEN** `HOME_VISIT_ENABLED` is `false`
- **THEN** the home page SHALL NOT render the "Servicio a domicilio" benefit card or the "A domicilio" floating badge

### Requirement: The flag never affects historical data or admin tooling
Regardless of `HOME_VISIT_ENABLED`'s value, every historical `Request` of type `HOME_VISIT`, the `EnabledComuna` administration screen, and the admin requests inbox's home-visit filter and labels SHALL remain fully accessible and unaffected.

#### Scenario: Admin tooling and historical data stay available while disabled
- **WHEN** `HOME_VISIT_ENABLED` is `false`
- **THEN** `/admin/home-visits` SHALL remain reachable and SHALL continue to display all comuna and historical request data exactly as when the flag is enabled

### Requirement: Disabling the flag never deletes or alters data
Toggling `HOME_VISIT_ENABLED` SHALL NOT delete, migrate, or alter any `Request`, `EnabledComuna`, or related row — it is a presentation-layer toggle only.

#### Scenario: Toggling the flag is fully reversible
- **WHEN** `HOME_VISIT_ENABLED` is set to `false` and later set back to `true`
- **THEN** the public feature SHALL be fully restored with no data loss and no code change required
