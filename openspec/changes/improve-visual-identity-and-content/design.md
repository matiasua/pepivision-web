## Context

Confirmed this turn: no favicon/app-icon/Apple-Touch-Icon file or metadata exists anywhere under `app/`. The existing icon set (`components/icons.tsx`) is a small, hand-built collection of inline SVGs (`ChevronDownIcon`, `MenuIcon`, `WhatsAppIcon`, `InstagramIcon`, etc.) already used consistently across most of the site — the gap is narrower than "no icons exist," it's "no favicon metadata, and no defined extension point for the new lens-configuration content `redesign-extensible-catalog-v2` is adding to `/cristales`."

## Goals / Non-Goals

**Goals:**
- Standard favicon/app-icon/Apple-Touch-Icon metadata, wired through Next.js's metadata API (`app/layout.tsx` / `app/icon.tsx` conventions), consistent with the rest of the site's `metadata` exports already used per-page.
- One consistent icon family — extend `components/icons.tsx` rather than introducing a second icon source (emoji, a new SVG library) for new content.
- Baseline accessibility completeness: alt text, `prefers-reduced-motion`.

**Non-Goals:**
- Not redesigning the brand palette, typography, or overall visual language — this is icon/metadata/accessibility completeness, not a rebrand.
- Not building the lens-type/treatment/option icon set's *content* — that depends on `redesign-extensible-catalog-v2` finalizing the definitive list (Monofocal/Bifocal/Progresivo, six treatments, five additional options) first; this change only establishes that new icons for that content follow the existing `components/icons.tsx` pattern once the content is final.

## Decisions

### Favicon/app-icons via Next.js's file-based metadata convention

Use Next.js's supported `app/icon.tsx` (or static `app/icon.png`/`app/apple-icon.png`) convention rather than manually authoring `<link rel="icon">` tags — consistent with how the rest of the app already uses the App Router's metadata API (`export const metadata` per page) rather than hand-rolled `<head>` management.

### One icon family, extended not replaced

`components/icons.tsx`'s existing inline-SVG pattern (each icon a small React component, matching the brand's stroke-width/style) is the system of record — new icons (for lens types/treatments/options, once `redesign-extensible-catalog-v2` finalizes that content) are added to this same file in the same style, never as ad hoc emoji or a second imported icon library.

### Accessibility baseline

- Every meaningful image (brand logos, product/category photos, decorative icons that convey information) gets a real `alt` — decorative-only icons get `alt=""` or `aria-hidden`, consistent with existing practice on some components (e.g. `BrandCarousel.tsx`'s per-logo alt-text derivation already exists — audit for gaps elsewhere, don't rebuild what's already correct).
- `prefers-reduced-motion` is verified on the existing brand-carousel marquee (already partially handled per its doc-comment) and extended to any other CSS animation found during the audit.

## Risks / Trade-offs

- **[Risk]** Adding icons for lens-configuration content before that content is finalized would need rework. → **[Mitigation]** This change explicitly sequences that specific task after `redesign-extensible-catalog-v2`'s content lands (see proposal.md → "Dependencia"); everything else in this change is independent and can proceed now.
- **[Risk]** An alt-text audit could be large in scope if done exhaustively across every image on the site. → **[Mitigation]** Prioritize meaningful/informational images (brand logos, product/category photos) first; purely decorative icons already using `aria-hidden` are lower priority.

## Migration Plan

1. Add favicon/app-icon/Apple-Touch-Icon files and wire their metadata.
2. Audit and complete alt-text coverage.
3. Verify/extend `prefers-reduced-motion` handling.
4. Once `redesign-extensible-catalog-v2` finalizes lens-type/treatment/option content, add matching icons to `components/icons.tsx` and wire them into `/cristales`.
5. **Rollback**: purely additive/presentational; a plain revert has no data implications.

## Open Questions

- None outstanding — this change's only real dependency (lens-configuration content) is already tracked in `redesign-extensible-catalog-v2`'s own design.md.
