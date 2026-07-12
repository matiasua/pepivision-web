# Ionix Design System

Design system for **Ionix** — specifically **Ionix Trust**, the company's
enterprise SaaS product for identity, antifraud and transactional control,
sold across regulated LATAM industries (fintech, banking, retail/e-commerce,
insurance, government, telecoms).

> **Company description given at kickoff:** "Ionix → Prisma hackathon" —
> this design system was requested for a hackathon context (Prisma), using
> Ionix's live marketing site as the brand source.

## Source material

This design system was built from a **single screenshot**, provided at
`uploads/screencapture-ionixlatam-2026-07-02-16_59_43.png` — a full-page
capture of the live marketing site at **ionixlatam.com** (window title
visible in the capture: `Ionix Trust | Confianza Digital y Seguridad
Transaccional en LATAM`).

**No codebase, Figma file, or brand guideline was attached.** Per process,
everything here — colors, spacing, radii, type scale, component inventory —
was reverse-engineered by pixel-sampling and cropping that one screenshot.
See the CAVEATS at the end of this file: this is a real but **lossy**
source. If you can attach the live codebase, a Figma file, or brand
guidelines, re-run this system for much higher fidelity.

## Product covered

- **Ionix Trust** — the only product visible in the source. A marketing/
  lead-gen homepage: nav, hero, trust stats, about, feature split, per-
  industry accordion cards, CTA trio, client logos, FAQ accordion, blog
  teasers, lead-capture form, footer. Recreated in
  `ui_kits/marketing-site/`.

No app/product-UI (dashboard, login, settings) was visible in the source —
only the public marketing site. If Ionix Trust has a logged-in product
surface, attach it and it can be added as a second UI kit.

## Index

- `styles.css` — root stylesheet, `@import`s only. Link this one file.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `base.css`
- `assets/`
  - `logos/ionix-logo.png` — the only real Ionix brand mark found (wordmark + icon), cropped directly from the screenshot
  - `certifications/certification-badges.png` — DRI, PCI-DSS, SOC 1/2, CMF trust badges as shown on the site (third-party compliance marks, not Ionix's own brand assets — kept for faithful recreation only)
  - `photography/` — the b&w team photo and 3 editorial blog images, cropped from the source
- `components/` — reusable primitives (see below)
- `ui_kits/marketing-site/` — full homepage recreation
- `guidelines/` — specimen cards for the Design System tab
- `SKILL.md` — portable skill file for Claude Code / other agents

### Components built

| Group | Directory | Contents |
|---|---|---|
| Core | `components/core/` | `Button`, `Badge` |
| Core | `components/cards/` | `Card`, `StatBlock`, `IconCircle` |
| Core | `components/forms/` | `Input`, `Textarea`, `Select` |
| Core | `components/navigation/` | `Accordion` |

**Intentional additions:** none beyond what's visible on the page — every
component above has a direct on-screen counterpart. `IconCircle` is named
generically (wrapping the orange circular icon motif used in the "Ionix
Combina..." section) rather than invented from nothing.

## Content fundamentals

**Language:** all copy on the source page is in **Spanish (LATAM)** —
"organizaciones que operan procesos críticos en mercados regulados de
LATAM." Any new copy should be written in Spanish first; do not default to
English.

**Voice:** confident, enterprise, consultative — closer to a B2B analyst
report than a startup landing page. Sentences are declarative and short.
Headlines favor a two-line contrast pattern: a plain white line followed by
an orange line that lands the point — *"Orquestando / Control"*,
*"Tecnología Global / Orquestación Regional"*, *"Identidad Confiable Para
Procesos Críticos Del Estado."*

**Person:** mixed, but leans **"we" (nosotros)** for company statements —
*"No competimos con los mejores proveedores del mundo. Los integramos y los
gobernamos..."* — and switches to direct **"tú/tu" address** in CTAs and
form copy — *"Evalúa Tu Operación Con Ionix," "Conversemos sobre tu
visión."* Never formal "usted."

**Vocabulary:** domain-heavy and precise — *orquestación, fricción,
trazabilidad, cumplimiento regulatorio, señales antifraude, arquitectura
enterprise.* This is written for risk/compliance/technology executives, not
consumers. Avoid casual slang or startup-speak ("supercharge," "game-
changer"); the tone is closer to a security vendor's whitepaper than a
consumer app.

**Casing:** headings and nav labels use **Title Case** even for full
sentences (*"Cómo Trabaja Ionix Trust En Cada Industria," "Lo Que Necesitas
Saber Para Operar Con Confianza"*). Buttons are **ALL CAPS** with letter-
spacing (*"HABLAR CON UN EXPERTO," "CONOCE MÁS"*). Body paragraphs are
normal sentence case.

**Numbers as proof:** stat callouts are terse and always prefixed with
`+` — *"+15 Años De Experiencia," "+400 Millones De Transacciones," "+3
Países En LATAM."* Use this pattern for any new trust-stat content.

**Emoji:** never used. Not part of this brand's voice at all.

**Structure:** benefit copy is almost always delivered as short bullet
lists under a bolded sub-label ("Beneficios Clave," "Partners
Estratégicos") rather than long paragraphs — keep new sections scannable.

## Visual foundations

**Color:** a single dark theme — warm near-black (`#211E1D`) as the page
canvas, with **no light-mode variant observed**. Surfaces step up in
elevation via a cooler, purple-tinted dark fill (`#2B2338`) plus a
1px near-white hairline border at ~8% opacity — never a drop shadow (shadows
would be invisible on dark-on-dark, so elevation reads through fill + border
contrast instead). The two brand accents — **orange `#F2641A`** and
**blue `#1D4FF3`** — are used as a matched pair, almost never alone: primary
buttons, the stat ribbon, and the lead-form panel all run the same
orange→blue (or blue→orange) diagonal sweep. Orange alone marks the second
line of two-line headlines and small UI accents (icon fills, list bullets,
link arrows). Blue alone marks outlined pill badges and secondary-button
borders. Body copy sits in a muted warm gray (`--ionix-gray-400`), never
pure white — white is reserved for headings.

**Type:** big, rounded, confident display type (Fredoka-style) for every
heading, paired with a plain, highly legible grotesque (Inter) for body,
nav, and buttons. The display face's exaggeratedly round bowls ("O," "Q,"
single-story "a") are also echoed in the wordmark itself — it's a deliberate
"serious infrastructure company, approachable delivery" contrast: hard
subject matter (fraud, compliance, security), soft/friendly type.

**Spacing:** generous vertical rhythm — sections breathe with roughly
80–120px of padding top/bottom; card interiors use 24–32px padding.
Nothing feels dense; this is an enterprise trust-building site, not a
dashboard.

**Backgrounds:** flat dark color is the default. Three deliberate
exceptions: (1) the stats ribbon and the lead-capture form both use the
full orange→blue **gradient as a section background**, not just on buttons —
these are the two "high-energy" moments on the page; (2) a very faint
diagonal **grid/graph-paper texture** appears behind the industries and
"Ionix Combina..." sections — subtle, decorative, not load-bearing; (3) a
soft **radial color glow** (blurred orange/blue blobs) sits behind the CTA
and client-logos sections to keep the transition from the gradient block
back to flat dark from feeling abrupt. No hand-drawn illustration, no
repeating icon pattern, no photographic full-bleed hero — imagery is used
sparingly and always as a **contained, rounded-corner panel** (the b&w team
photo), never full-bleed.

**Imagery color treatment:** the one "About" photo is desaturated to
near-black-and-white with a warm highlight bloom — cool, editorial, human,
matching the enterprise-trust tone rather than a bright/colorful consumer
look. Blog thumbnails, by contrast, are small, colorful, stock-photo tech
imagery (icons, hands, screens) — clearly a different, lower-priority
content tier than the hero photography.

**Animation:** cannot be observed from a static screenshot. The FAQ and
industry cards are clearly interactive accordions (chevron/plus-minus
affordances), so expect a simple height/opacity expand-collapse transition;
no other motion evidence exists. Assume short, subtle, non-bouncy
transitions consistent with the serious enterprise tone — **flag this as
unconfirmed** and revisit if the real codebase becomes available.

**Hover/press states:** not capturable from a still image — no source
evidence either way. Recreate with a conservative, standard treatment
(slight brightness/opacity lift on hover, slight scale-down on press) until
real states can be confirmed against the live site or code.

**Borders:** hairline (1px), low-opacity white on dark cards; **solid,
higher-contrast blue** on outline pill badges and outline buttons — the
blue border is a deliberate "secondary action" signal distinct from the
gradient-filled "primary action" pill.

**Corner radii:** buttons and badges are **fully pill-shaped**
(`border-radius: 999px`); cards use a moderate ~20px rounding; form inputs
use a smaller ~10–12px rounding. Nothing in the source is sharp-cornered.

**Transparency/blur:** used narrowly — the radial glows behind CTA/client
sections, and a subtle scrim over the "La Seguridad No Se Suma" background
photo so white text stays legible. Not used as a general "glassmorphism"
surface treatment anywhere (no frosted-glass cards).

**Cards:** dark purple-tinted fill, thin light border, generous internal
padding, moderate rounding, **no drop shadow**. Industry cards additionally
carry a faint vertical-line "graph paper" texture inside them and a small
icon in a solid-orange rounded-square swatch at the top.

## Iconography

- **Style:** simple **outlined/duotone line icons** (bank column, shopping
  cart, phone/telco, building, dollar tag) sized small and placed inside a
  colored container — either a solid-orange rounded square (industry cards)
  or a solid-orange circle (the "Ionix Combina..." CTA trio). No filled
  icon style, no photographic icons.
- **Source:** no icon font, sprite sheet, or SVG set was recoverable from a
  screenshot-only source — icons could not be copied from a codebase. The
  visual style (rounded stroke line icons, ~1.5–2px stroke) is closest to
  **Phosphor Icons** or **Lucide** among common CDN icon sets. **This is a
  flagged substitution** — component/UI-kit icons in this system use
  inline SVGs in that visual family as a stand-in for the real icon set.
  Please provide the real icon source (codebase icon folder or Figma) to
  replace these with pixel-accurate originals.
- **Emoji:** never used, anywhere on the page.
- **Unicode glyphs as icons:** the `+` prefix on stat numbers ("+15," "+400")
  functions as a lightweight iconographic device rather than a literal icon.
- **Photographic/PNG marks:** third-party certification badges (DRI, PCI-
  DSS, SOC 1/2 Type 2, CMF) are used as raster PNG/logo marks, not
  recreated as icons — copied as-is into `assets/certifications/` for
  faithful display only.

## Foundation specimen cards

Small cards in the Design System tab, grouped as: **Colors** (brand accents,
neutral/surface scale, text-on-dark, gradients), **Type** (display scale,
body scale, eyebrow/button labels, font family specimens), **Spacing**
(spacing scale, corner-radius scale, card elevation in use), **Brand**
(logo, photography style, certification badges, iconography style). All
live in `guidelines/`.

## Caveats & ask

- **Screenshot-only source.** No codebase or Figma access was available, so
  exact CSS values (precise paddings, exact grays, exact easing curves) are
  *estimated from pixels*, not read from source. Treat spacing/radius/shadow
  tokens as "very close" rather than exact.
- **Fonts are substituted.** The real Ionix typefaces are unknown — Fredoka
  (display) and Inter (body) are the closest Google Fonts matches to the
  rounded headline face and the plain body grotesque seen in the screenshot.
  **Please share the actual brand fonts (names or files) if you have them.**
- **No logo file was provided** — the "ionix" mark used everywhere in this
  system is a pixel crop taken directly from the screenshot, not redrawn.
  It will look soft/low-res if scaled up; a vector/SVG source would fix this.
  Client logos (Edenred, MACH, Chile Express) and certification badges
  (DRI, PCI-DSS, SOC, CMF) are likewise raw crops of third-party marks,
  used only inside the marketing-site recreation for fidelity — they are
  **not** Ionix brand assets and shouldn't be reused as such.
- **Single page only.** The screenshot covers the homepage top-to-bottom;
  no other pages (blog post, FAQ page, industry detail pages, login) were
  available, so the component inventory only covers what that one page needs.

**Bold ask:** attach the Ionix Trust codebase (or a Figma link) and I'll
redo colors/spacing/type as exact tokens instead of estimates, expand the
component set to whatever the real design system defines, and pull the
real logo + font files instead of screenshot crops. Also tell me if there's
a second product (app dashboard, admin panel) to cover as its own UI kit.
