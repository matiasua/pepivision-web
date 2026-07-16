## ADDED Requirements

### Requirement: The site declares a favicon and app icons
The application SHALL declare a favicon, app icons, and an Apple Touch Icon via Next.js's metadata conventions, so the site has a proper icon in browser tabs, bookmarks, and when added to a mobile home screen.

#### Scenario: A browser tab shows the site's icon
- **WHEN** any page of the site is loaded in a browser
- **THEN** the browser tab SHALL display the configured favicon rather than a generic default icon

### Requirement: Iconography is drawn from a single consistent set
Informational icons across the public site SHALL be drawn from the existing `components/icons.tsx` SVG set, not from ad hoc emoji or a second icon library.

#### Scenario: A home-page benefit card uses the shared icon set
- **WHEN** any home-page benefit card is rendered
- **THEN** its icon SHALL come from the shared icon component set, not an emoji character

### Requirement: Meaningful images have descriptive alt text
Every meaningful image (brand logo, product photo, category image) SHALL have descriptive `alt` text; purely decorative icons SHALL be marked so assistive technology skips them.

#### Scenario: A brand logo has descriptive alt text
- **WHEN** a brand logo is rendered in the carousel or elsewhere
- **THEN** it SHALL have non-empty `alt` text describing the brand

#### Scenario: A decorative icon does not clutter screen-reader output
- **WHEN** a purely decorative icon is rendered
- **THEN** it SHALL be hidden from assistive technology (e.g. `aria-hidden` or empty `alt`)

### Requirement: Animated elements respect reduced-motion preference
Any CSS-driven animation on the public site SHALL be reduced or disabled when the visitor's `prefers-reduced-motion` setting requests it.

#### Scenario: A visitor with reduced motion enabled sees a static or slowed carousel
- **WHEN** a visitor with `prefers-reduced-motion: reduce` views the home-page brand carousel
- **THEN** the carousel's motion SHALL be reduced or stopped rather than playing at full animation speed
