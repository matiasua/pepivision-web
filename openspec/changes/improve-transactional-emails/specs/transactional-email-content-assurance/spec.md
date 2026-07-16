## ADDED Requirements

### Requirement: Data-rights requests generate a customer-facing confirmation, symmetric with other request types
Submitting a data-rights (ARCO) request SHALL send a customer-facing confirmation email in addition to the existing business notification, matching the customer/business symmetry already provided for quote and home-visit requests.

#### Scenario: An ARCO submission sends both emails
- **WHEN** a customer submits a data-rights request
- **THEN** the system SHALL send a customer confirmation email and a business notification email, both logged as `EmailLog` entries

#### Scenario: The customer confirmation does not restate the free-text description
- **WHEN** the customer confirmation email is generated
- **THEN** it SHALL acknowledge the request and the right requested, and SHALL NOT include the customer's full free-text description — that detail remains business-only, per the existing data-minimization principle for this flow

### Requirement: Transactional email tests assert on rendered content, not only delivery
Integration tests for quote and home-visit requests SHALL assert that the delivered email's body contains the expected key fields (category/model for quotes, comuna for home-visit), not only that a message arrived at the recipient address.

#### Scenario: A quote email's content is verified
- **WHEN** a quote request integration test runs
- **THEN** it SHALL fetch the delivered message's body from Mailpit and assert that the chosen category and model name appear in it

#### Scenario: A home-visit email's content is verified
- **WHEN** a home-visit request integration test runs
- **THEN** it SHALL fetch the delivered message's body from Mailpit and assert that the submitted comuna appears in it

### Requirement: Business hours shown in every email reflect the administrator-configured value
Every transactional email's footer SHALL display the business hours currently configured in `BusinessSettings`, with no template hardcoding an hours string.

#### Scenario: Updating business hours changes every future email
- **WHEN** an administrator updates the business hours in `/admin/settings`
- **THEN** every transactional email sent afterward SHALL display the newly configured hours, with no code change required
