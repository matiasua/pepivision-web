## Why

The site has no favicon, app icons, or Apple Touch Icon configured today (confirmed via `find app -maxdepth 1 -iname "*icon*" -o -iname "favicon*"` returning nothing), and its iconography is inconsistently sourced — some pages use hand-built inline SVGs (`components/icons.tsx`), while the mockup-derived pages occasionally lean on ad hoc symbols. The business wants a coherent visual identity pass: proper icon metadata, consistent iconography (especially for `/cristales`, which is gaining new lens-type content under `redesign-extensible-catalog-v2`), and baseline accessibility/motion considerations (alt text, `prefers-reduced-motion`) applied consistently.

## What Changes

- Add favicon, app icons (various sizes), and Apple Touch Icon, wired into `app/layout.tsx` metadata — currently entirely absent.
- Establish a single, consistent icon family/style used across the home page, `/cristales`, and the four home-page benefit cards ("Atención personalizada," "Lentes según tu receta," "Modelos modernos," "Cotización rápida," and — only while `temporarily-disable-home-visit`'s flag is enabled — "Servicio a domicilio") — no more mixing arbitrary emoji with the existing hand-built SVG icon set.
- Extend the icon set to cover `redesign-extensible-catalog-v2`'s new lens-type/treatment/option content (Monofocal/Bifocal/Progresivo, the six treatments, the five additional options) once that change defines the definitive list — a content dependency, not a code dependency.
- Audit and complete `alt` text coverage across the site's images (brand logos, product photos, category images).
- Apply `prefers-reduced-motion` to existing CSS-driven animation (at minimum the home-page brand carousel's marquee, which already has some reduced-motion handling per its doc-comment — verify and extend to any other animated element found).

## Capabilities

### New Capabilities
- `visual-identity-and-accessibility`: favicon/app-icon metadata, the consistent iconography system, alt-text coverage, and `prefers-reduced-motion` handling.

### Modified Capabilities
- None in `openspec/specs/` — this is presentation-layer polish with no behavioral/data requirement change to any existing archived capability.

## Impact

- **`app/layout.tsx`**: add icon metadata (favicon, app icons, Apple Touch Icon references).
- **`components/icons.tsx`, `app/cristales/page.tsx`, `app/page.tsx`**: consistent icon sourcing; no emoji mixed with the SVG set.
- **Images across the site**: alt-text audit — no code architecture change, a content/attribute completeness pass.
- **Dependency**: the `/cristales` iconography extension depends on `redesign-extensible-catalog-v2` finalizing its lens-type/treatment/option content (design.md → "Contenido de cristales, tratamientos y opciones adicionales") — this change can start everything else (favicon, home-page icons, alt-text, reduced-motion) independently and only waits on that one piece.
- **No impact** to: any data model, authentication, or business logic.
