# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Pepi Visión 360 **V1 is complete, validated, and archived** — see `openspec/changes/archive/2026-07-14-add-pepi-vision-360-v1/`. Its delta specs were synced into `openspec/specs/`, which is now the **V1 baseline** (admin auth, business settings, data-rights requests, home-visit coverage/requests, product catalog, product image storage, product management, public site, quote requests, request inbox).

The active change is **`redesign-extensible-catalog-v2`** (`openspec/changes/redesign-extensible-catalog-v2/`), which generalizes the catalog from a single frame-only model into a category/offering data model. Phases 1–4 are implemented and published. **Phase 5 has local, uncommitted work that must be reviewed before it is consolidated** — the category taxonomy changed after Phase 5 was built. The definitive categories going forward are only:
1. **Lentes ópticos**
2. **Lentes de sol**

`Armazones` will **not** be its own category — it becomes a physical product selectable within *Lentes ópticos*. Phase 5's current implementation (3 categories, including `armazones` as a peer category) predates this decision and needs rework, not blind consolidation.

Operational constraints on how work happens here, regardless of phase:
- **All development and validation runs through Docker Compose** (`compose.yaml`) — the app, Postgres, MinIO, Mailpit, Nginx, and the E2E/Lighthouse runners are all Compose services. Don't assume a bare local Node/Postgres setup has parity with it.
- **Do not create AWS resources, use the AWS CLI, or deploy anything.** AWS Lightsail remains the eventual target host (see Target architecture below), but provisioning or deploying to it requires explicit, separate authorization — nothing in this file grants it.
- `design-reference/` remains **read-only** — see Repository layout below; never modify, delete, move, or rename anything under it without explicit user authorization.
- **OpenSpec (`openspec/`), the application code, the Prisma schema, and the test suite are the functional source of truth.** A knowledge graph of this repo may exist at `graphify-out/` (see Graphify usage below) — it is a navigation and impact-analysis aid, never a substitute for reading the actual specs/code/schema/tests.

## What Pepi Visión 360 is

Pepi Visión 360 is a Chilean virtual optical store (óptica virtual): eyewear frames, custom lenses, and home delivery, sold with quotes handled over WhatsApp rather than online checkout. This originally came entirely from the mockup in `design-reference/` (see below); the functional baseline is now `openspec/specs/` (V1) plus the active `redesign-extensible-catalog-v2` change — `design-reference/` remains the original visual reference, not the spec of record.

The product surface implied by the mockup has two sides:
- **Public site**: home, frames catalog (`Catálogo de armazones`) with product detail pages, lens types (`Tipos de cristales`) with treatments/comparison, a 5-step quote builder (`Cotizador de lentes`) that ends in a WhatsApp handoff (`wa.me/...`), home delivery / coverage-by-comuna (`Atención a domicilio`), about (`Una óptica cercana y moderna`), FAQ, contact, plus legal pages (Privacy Policy, ARCO rights request form, Terms & Conditions — Chilean data-protection framing).
- **Admin panel** (`Panel de administración`, login-gated): three sections — **Modelos** (CRUD for frame models: name, code, price from, measurements, target audience, shape, material, availability, tag, colors, description, photos), **Solicitudes** (incoming quote requests, with delete/confirm flow), and **Configuración** (business info: WhatsApp number, visible phone, email, Instagram handle, hours, location).

Brand palette used throughout the mockup (inline CSS vars, not a token system): `--navy:#16265F`, `--fucsia:#E5127D`, `--rosado:#F65BA8`, `--grafito:#4a5170`. Copy is Spanish (Chile).

## Target architecture

The approved target stack for the real application:

- **Modular monolith** (not microservices)
- **Next.js**
- **TypeScript** in strict mode
- **Tailwind CSS**
- **PostgreSQL**
- **Prisma** as the ORM
- **Zod** for schema/runtime validation
- **Nginx** as reverse proxy
- **Docker Compose** for orchestration
- **AWS Lightsail** as the hosting target (not yet provisioned — see Project status: no AWS resources or deploys without explicit authorization)

Operational constraints that apply:
- PostgreSQL must **never** be exposed publicly — it's only reachable from other containers on the internal Docker network.
- Product images must be stored **outside** the application container (e.g. a mounted volume or external object storage), not baked into the image or written to container-local disk.
- `localStorage` (or any browser-only storage) must **not** be used as production persistence — it's fine for ephemeral UI state, not for data that needs to survive or be shared across devices/sessions.
- No secrets, passwords, tokens, or credentials committed to Git, ever — use `.env` files (already gitignored) or the deployment platform's secret store.

## Documentation of decisions

Every relevant architectural decision (schema changes, infra choices, deviations from the target stack above, etc.) must be documented — as part of the OpenSpec change's design doc, not left implicit in code or commit messages.

## Pre-completion checks

Before considering any implementation task complete, run and pass:
1. Lint
2. Typecheck
3. Tests
4. Build

See `package.json` scripts (`lint`, `build`, `ci`, etc.) for exact commands — all of them are expected to run inside Docker Compose, not against a bare host install.

## GUI acceptance gate

1. Every phase that modifies a page, component, form, navigation, visual email, or document must include a manual GUI review.

2. Automated tests, E2E, axe, and Lighthouse are necessary, but not sufficient to approve an interface.

3. Before marking a visual phase complete, review:
   - desktop;
   - tablet;
   - mobile;
   - visual hierarchy;
   - branding;
   - spacing;
   - responsiveness;
   - legibility;
   - accessibility;
   - browser console;
   - empty states;
   - errors;
   - loading;
   - keyboard interaction;
   - horizontal scroll.

4. Temporary screenshots must be generated at, at minimum:
   - 1440 × 900;
   - 768 × 1024;
   - 390 × 844.

5. Screenshots must not be committed automatically.

6. A visual phase must stop for owner review before:
   - commit;
   - tag;
   - OpenSpec archive;
   - starting the next phase.

7. If the owner rejects the aesthetics:
   - the phase is considered reopened;
   - a corrective iteration is performed;
   - work does not advance even if all tests are green.

8. Never claim a GUI is "professional", "polished", or "done" based solely on automated tests.

9. When Playwright is used for visual validation:
   - it does not replace manual review;
   - it must check URL, responsiveness, interaction, and absence of overflow;
   - tests must not depend on fragile pixel-perfect screenshots unless explicitly decided.

10. The final report for every visual phase must include:
    - functional summary;
    - visual summary;
    - sizes reviewed;
    - findings fixed;
    - pending items;
    - confirmation of owner approval or that it is awaiting owner approval.

## Repository layout

- **`design-reference/`** — the original, definitive export from Claude Design. It is a visual and functional **reference** for the app, not a production application itself, and it is **read-only**: never modify, delete, move, or rename anything under this directory without explicit user authorization.
  - `_pepi-standalone-src.html` — the actual source of the mockup (single-file, inline styles/scripts); read this one for content and flow details, not the other two.
  - `Pepi Vision 360.dc.html` / `Pepi Vision 360 (standalone).html` — rendered/bundled output of the same mockup; auto-generated, don't hand-edit.
  - `support.js` — generated runtime for the `.dc.html` preview format (`// GENERATED ... do not edit`). Irrelevant to the real app.
  - `image-slot.js` — an "omelette" design-tool component for droppable image placeholders in the mockup; not part of the real app.
  - `_ds/ionix-design-system-.../` — **unrelated leftover**: a design system reverse-engineered for a different company/product ("Ionix Trust", an enterprise antifraud SaaS). Its colors/type/voice do **not** apply to Pepi Visión 360 — the Pepi mockup uses its own inline palette and never references this `_ds` bundle. Don't pull branding or tokens from here.
  - `assets/`, `uploads/`, `screenshots/` — logo and reference images used by the mockup.

- **`openspec/`** — spec-driven change workflow (schema: `spec-driven`, see `openspec/config.yaml`).
  - `openspec/specs/` — the **current baseline** (synced from the archived V1 change): admin-auth, business-settings, data-rights-requests, home-visit-coverage, home-visit-requests, product-catalog, product-image-storage, product-management, public-site, quote-requests, request-inbox.
  - `openspec/changes/archive/2026-07-14-add-pepi-vision-360-v1/` — the completed, archived V1 change proposal.
  - `openspec/changes/redesign-extensible-catalog-v2/` — the **active** change (see Project status above for its current phase).

- **`.claude/commands/opsx/*.md`** and **`.claude/skills/openspec-*/`** — the OpenSpec workflow's slash commands and skills (`/opsx:propose`, `/opsx:apply`, `/opsx:update`, `/opsx:sync`, `/opsx:archive`, and an explore mode). Use these to move work from idea → spec/design/tasks → implementation → archived spec, rather than writing ad hoc plans.

- **`graphify-out/`** — a generated knowledge-graph snapshot of this repo (`graph.json`, `graph.html`, `GRAPH_REPORT.md`, plus cache/manifest files), produced by the `/graphify` skill. It's a navigation and impact-analysis aid, regenerated on demand — see Graphify usage below. Never hand-edit its contents.

## Working in this repo right now

Expect most tasks to be either:
1. **OpenSpec work** on `redesign-extensible-catalog-v2` — proposing, updating, applying, or archiving tasks for a phase. Use the corresponding `opsx:*` skill/command rather than hand-rolling the workflow. Phase 5 specifically needs its plan reconciled with the two-category taxonomy (Lentes ópticos / Lentes de sol) before its local changes are consolidated.
2. **Implementation** of an approved phase's tasks, validated via Docker Compose (lint/typecheck/tests/build, plus the E2E/a11y/Lighthouse suites where applicable).

Don't start net-new implementation work on a phase whose tasks/design aren't already approved in the active change — propose or update the OpenSpec artifacts first.

## Graphify usage

If `graphify-out/` exists, treat it as a navigation and impact-analysis tool — not a functional source of truth (OpenSpec, code, Prisma, and tests remain authoritative; see Project status above):
- Read `graphify-out/GRAPH_REPORT.md` before any architecture-wide analysis.
- Prefer `graphify query` / `graphify path` / `graphify explain` over broad manual greps when the question is about relationships or reachability.
- Verify every graph finding against the real files before acting on it — the graph is a map, not the territory.
- Prioritize `EXTRACTED` relationships (explicit in source) over `INFERRED` ones.
- Treat `INFERRED` relationships as hypotheses to check, not facts.
- Don't decide on a change based solely on dangling-endpoint or health-check warnings from the graph — those reflect extraction artifacts, not necessarily real code issues.
- Never hand-edit `graph.json` — regenerate it via `/graphify` instead.
- Don't refactor "god nodes" or import cycles the graph surfaces unless the current task actually requires it and a real defect is confirmed independently of the graph.
