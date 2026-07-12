# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repository is **pre-implementation**. There is no application source code, package manager manifest, build tooling, or test suite yet — only planning scaffolding and a visual design reference. If asked to run a build/lint/test command, check first whether one has since been added (`package.json`, `Makefile`, etc.) rather than assuming none exists.

**Do not start implementation work — including installing dependencies or scaffolding the Next.js app — until an OpenSpec change has been proposed and explicitly approved.** During the current design-analysis stage, only read/interpret `design-reference/`, `openspec/`, and other planning docs; don't run `create-next-app`, `npm install`, `npx prisma init`, etc.

## What Pepi Visión 360 is

Pepi Visión 360 is a Chilean virtual optical store (óptica virtual): eyewear frames, custom lenses, and home delivery, sold with quotes handled over WhatsApp rather than online checkout. This context comes entirely from the mockup in `design-reference/` (see below) — there is no PRD elsewhere in the repo.

The product surface implied by the mockup has two sides:
- **Public site**: home, frames catalog (`Catálogo de armazones`) with product detail pages, lens types (`Tipos de cristales`) with treatments/comparison, a 5-step quote builder (`Cotizador de lentes`) that ends in a WhatsApp handoff (`wa.me/...`), home delivery / coverage-by-comuna (`Atención a domicilio`), about (`Una óptica cercana y moderna`), FAQ, contact, plus legal pages (Privacy Policy, ARCO rights request form, Terms & Conditions — Chilean data-protection framing).
- **Admin panel** (`Panel de administración`, login-gated): three sections — **Modelos** (CRUD for frame models: name, code, price from, measurements, target audience, shape, material, availability, tag, colors, description, photos), **Solicitudes** (incoming quote requests, with delete/confirm flow), and **Configuración** (business info: WhatsApp number, visible phone, email, Instagram handle, hours, location).

Brand palette used throughout the mockup (inline CSS vars, not a token system): `--navy:#16265F`, `--fucsia:#E5127D`, `--rosado:#F65BA8`, `--grafito:#4a5170`. Copy is Spanish (Chile).

## Target architecture

The approved target stack for the real application (to be scaffolded only once an OpenSpec proposal for it is approved — see Project status above):

- **Modular monolith** (not microservices)
- **Next.js**
- **TypeScript** in strict mode
- **Tailwind CSS**
- **PostgreSQL**
- **Prisma** as the ORM
- **Zod** for schema/runtime validation
- **Nginx** as reverse proxy
- **Docker Compose** for orchestration
- **AWS Lightsail** as the hosting target

Operational constraints that apply once this is built:
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

(Exact commands will be defined once the Next.js app is scaffolded — check `package.json` scripts at that point.)

## Repository layout

- **`design-reference/`** — the original, definitive export from Claude Design. It is a visual and functional **reference** for the future app, not a production application itself, and it is **read-only**: never modify, delete, move, or rename anything under this directory without explicit user authorization.
  - `_pepi-standalone-src.html` — the actual source of the mockup (single-file, inline styles/scripts); read this one for content and flow details, not the other two.
  - `Pepi Vision 360.dc.html` / `Pepi Vision 360 (standalone).html` — rendered/bundled output of the same mockup; auto-generated, don't hand-edit.
  - `support.js` — generated runtime for the `.dc.html` preview format (`// GENERATED ... do not edit`). Irrelevant to the future real app.
  - `image-slot.js` — an "omelette" design-tool component for droppable image placeholders in the mockup; not part of the future app.
  - `_ds/ionix-design-system-.../` — **unrelated leftover**: a design system reverse-engineered for a different company/product ("Ionix Trust", an enterprise antifraud SaaS). Its colors/type/voice do **not** apply to Pepi Visión 360 — the Pepi mockup uses its own inline palette and never references this `_ds` bundle. Don't pull branding or tokens from here.
  - `assets/`, `uploads/`, `screenshots/` — logo and reference images used by the mockup.

- **`openspec/`** — spec-driven change workflow (schema: `spec-driven`, see `openspec/config.yaml`). `openspec/specs/` (current specs) and `openspec/changes/` (in-flight change proposals) are both currently empty — no specs or changes have been created yet.

- **`.claude/commands/opsx/*.md`** and **`.claude/skills/openspec-*/`** — the OpenSpec workflow's slash commands and skills (`/opsx:propose`, `/opsx:apply`, `/opsx:update`, `/opsx:sync`, `/opsx:archive`, and an explore mode). Use these to move work from idea → spec/design/tasks → implementation → archived spec, rather than writing ad hoc plans.

## Working in this repo right now

Since there's no app code yet and implementation is gated on an approved OpenSpec proposal (see Project status), expect most tasks right now to be:
1. **OpenSpec work** — proposing, updating, applying, or archiving a change under `openspec/`. Use the corresponding `opsx:*` skill/command rather than hand-rolling the workflow.
2. **Design analysis** — reading `design-reference/_pepi-standalone-src.html` as the functional/content spec (pages, admin CRUD fields, WhatsApp-based quote flow) to inform an OpenSpec proposal against the target architecture above — without scaffolding or installing anything yet.

Once a proposal covering the initial app setup is approved, follow it (and the target architecture section above) to scaffold the real application.
