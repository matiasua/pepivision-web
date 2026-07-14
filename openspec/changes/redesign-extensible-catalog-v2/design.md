## Context

Today's catalog (built under the in-flight change `add-pepi-vision-360-v1`, **not yet archived into `openspec/specs/`** — that directory is currently empty) models exactly one commercial thing per `Product` row: a frame, sold as itself. The relevant pieces are:

- **`Product`** (`prisma/schema.prisma`): `id, code, slug, name, brandId?, gender, shape, material, sizes?, priceFromClp, description?, badge?, available, visible, colors: ProductColor[], images: ProductImage[]`. `priceFromClp` is a single non-nullable price. There is no notion of "this frame, offered as X."
- **`modules/catalog/`**: `schemas.ts` (`catalogFiltersSchema`: `q, gender, shape, material, color (free-text name), brand (slug), price (bucket), availableOnly`), `repository.ts` (`buildWhere` always starts from `Product` with `visible: true`), `service.ts` (`getCatalog`, `getProductBySlug` — one product = one catalog entry).
- **`app/catalogo/page.tsx`** and **`app/catalogo/[slug]/page.tsx`**: one flat list, one detail page keyed by `Product.slug`.
- **`components/catalog/CatalogFilters.tsx`**: gender/shape/material lists are `Object.values(enum)`; a `COLOR_SWATCHES` map is hardcoded to 7 Spanish color names, not read from the DB.
- **`app/cotizador/` + `components/quote/QuoteWizard.tsx`**: one fixed 5-step wizard (Armazón → Cristal → Tratamientos → Receta → Datos) — cristal/tratamientos/receta are unconditionally shown even though only "lentes ópticos" semantically needs them.
- **`modules/requests/service.ts#submitQuote`**: resolves `frameProductId`/`frameProductColorId` against `Product`/`ProductColor` server-side (never trusts client-sent names — an existing, correct pattern this design keeps), writes a flat `Request.details` JSON with `frameProductName/Code/ColorName/ColorHex, frameBrandId/Name/Slug, glassType, treatments, treatmentLabels, prescriptionAnswer` — no concept of category anywhere.
- **`modules/notifications/email/templates/quote-*.ts`**: same flat, single-frame shape.
- **`app/admin/products/`**: full CRUD for `Product`/`ProductColor`/`ProductImage`/`Brand` already exists and is reused as-is by this design — nothing here duplicates that work.

The business now needs the *same* frame sellable as three different commercial offers (armazón / lente óptico / lente de sol óptico) from day one, and needs future categories (lentes de sol sin receta, lentes de seguridad, lentes deportivos, accesorios, cristales, productos para bomberos/paramédicos, etc.) addable **without** a Prisma migration, a new enum, a duplicated catalog page, or duplicated `Product`/`ProductColor`/`ProductImage`/`Brand` rows.

## Goals / Non-Goals

**Goals:**
- Separate "what a frame physically is" (`Product`, unchanged) from "how it's commercially offered" (new `ProductOffering`), so one `Product` can appear under N categories with zero duplication of colors/images/brand/stock.
- Make `Category` fully data-driven (no Prisma enum, no per-category `if` chains) — a basic future category (reusing the existing capability flags and attribute system) must be creatable from `/admin/categories` with zero migration.
- Keep every existing security/data-integrity invariant already shipped: server always re-resolves product/color/brand from PostgreSQL (never trusts the client); prescription attachments stay in the private bucket with signed-URL admin access; colors/photos stay independently mutable without desync; audit logging on every admin mutation.
- Design a single configuration-driven quote wizard, not three near-duplicate ones.
- Design URL/redirect compatibility so no currently-published `/catalogo/[slug]` link breaks.

**Non-Goals:**
- No checkout/online payment (unchanged — the business still closes via WhatsApp/cotización).
- No implementation, no Prisma migration execution, no `/opsx:apply` in this pass — this is proposal + design + specs + tasks only.
- No change to authentication/session model, image storage strategy (MinIO bucket split), prescription-attachment security model, retention/audit mechanisms, or the `Brand` model — all reused verbatim.
- Not attempting to auto-populate óptico/solar offerings for existing products (explicit business decision per §12 of the request — only Armazones offerings are auto-created by the migration).
- Not designing a fully generic EAV system — see "Capacidades vs. atributos" below for why a bounded, typed alternative was chosen instead.

## Decisions

### Modelo de datos

```prisma
model Category {
  id               String   @id @default(cuid())
  name             String
  slug             String   @unique
  shortDescription String?
  description      String?
  active           Boolean  @default(true)
  visible          Boolean  @default(true)
  sortOrder        Int      @default(0)
  icon             String?
  imagePath        String?
  seoTitle         String?
  seoDescription   String?
  /// Validated by categoryCapabilitiesSchema (Zod) at every write — see
  /// "Capacidades tipadas" below. Never read as untrusted JSON downstream.
  capabilities     Json
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  offerings            ProductOffering[]
  attributeDefinitions CategoryAttributeDefinition[]

  @@map("categories")
}

model ProductOffering {
  id                    String    @id @default(cuid())
  productId             String
  product               Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  categoryId            String
  category              Category  @relation(fields: [categoryId], references: [id])
  /// Scoped to the category, NOT globally unique — see "Slugs por
  /// categoría" below. The same Product legitimately reuses the same slug
  /// string across its own offerings (/catalogo/armazones/coral and
  /// /catalogo/lentes-opticos/coral both existing is the expected case).
  slug                  String
  title                 String?
  commercialDescription String?
  /// Nullable: "sin precio público, cotizar" — see §5 (Precios).
  priceFromClp          Int?
  active                Boolean   @default(true)
  visible               Boolean   @default(true)
  featured              Boolean   @default(false)
  sortOrder             Int       @default(0)
  /// Reserved for future per-offering settings (e.g. price-component
  /// breakdown) — no consumer reads this in v1; see "Open Questions".
  configuration         Json?
  seoTitle              String?
  seoDescription        String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  deletedAt             DateTime?

  attributeValues ProductOfferingAttributeValue[]

  @@unique([productId, categoryId])
  @@unique([categoryId, slug])
  @@index([categoryId, visible])
  @@index([productId])
  @@map("product_offerings")
}

enum CategoryAttributeType {
  TEXT
  NUMBER
  BOOLEAN
  SELECT
  MULTI_SELECT
  /// Presentation/filter variant of NUMBER (renders a min/max range
  /// control), NOT a distinct storage shape — see "Tipos de atributo".
  RANGE
}

model CategoryAttributeDefinition {
  id              String                @id @default(cuid())
  categoryId      String
  category        Category              @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  /// Stable machine key (e.g. "certificacion") — the ONLY thing the
  /// dynamic filter allowlist ever matches against; see
  /// dynamic-catalog-filters spec.
  key             String
  label           String
  type            CategoryAttributeType
  required        Boolean               @default(false)
  filterable      Boolean               @default(false)
  visibleInCard   Boolean               @default(false)
  visibleInDetail Boolean               @default(true)
  sortOrder       Int                   @default(0)
  /// For SELECT/MULTI_SELECT: string[] (or {value,label}[]), validated by
  /// a Zod schema at write time — never trusted as arbitrary JSON when read.
  options         Json?
  active          Boolean               @default(true)
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt

  values ProductOfferingAttributeValue[]

  @@unique([categoryId, key])
  @@index([categoryId, filterable])
  @@map("category_attribute_definitions")
}

model ProductOfferingAttributeValue {
  id                    String                       @id @default(cuid())
  offeringId            String
  offering              ProductOffering              @relation(fields: [offeringId], references: [id], onDelete: Cascade)
  attributeDefinitionId String
  attributeDefinition   CategoryAttributeDefinition  @relation(fields: [attributeDefinitionId], references: [id], onDelete: Cascade)
  /// Exactly one of these three is populated, chosen by
  /// attributeDefinition.type — enforced in the service layer (Zod),
  /// not the DB. MULTI_SELECT is stored as a Zod-validated JSON array
  /// string in valueText; RANGE reuses valueNumber (see "Tipos de
  /// atributo"). This is a bounded, typed alternative to free-form EAV
  /// — see "Capacidades vs. atributos".
  valueText             String?
  valueNumber           Float?
  valueBoolean          Boolean?

  @@unique([offeringId, attributeDefinitionId])
  @@index([attributeDefinitionId, valueText])
  @@index([attributeDefinitionId, valueNumber])
  @@map("product_offering_attribute_values")
}
```

`Product`, `ProductColor`, `ProductImage`, `Brand`, `Request`, `RequestAttachment` are **unchanged** — this is the load-bearing guarantee behind "no duplicar armazones/colores/imágenes/marca."

**Decisiones de modelado:**
- **No Prisma enum for `Category`** (per explicit business constraint): categories are rows, not a closed code-level set. `CategoryAttributeType`, by contrast, *is* a small Prisma enum — that's a closed, code-known set of value shapes (text/number/boolean/select/multi_select/range) that will not grow when a new *category* is added, so it doesn't reintroduce the problem the "no enum" rule exists to prevent. This distinction (data-driven categories vs. a fixed value-kind enum) is called out explicitly so it doesn't read as inconsistent.
- **Slugs por categoría, no global**: `ProductOffering.slug` is unique per `(categoryId, slug)`, not globally, because the same `Product` is expected to reuse the same slug string across its own offerings (`/catalogo/armazones/coral`, `/catalogo/lentes-opticos/coral`). A global unique slug would force awkward per-category suffixes (`coral-optico`) that the user's own URL examples don't want.
- **`ProductOffering.priceFromClp` nullable**: null means "sin precio público, cotizar" (§5) — the UI renders "Cotizar" instead of "Desde $X" rather than a fake `$0`.
- **`Product.priceFromClp` kept temporarily as a compatibility field, `ProductOffering.priceFromClp` is the commercial source of truth** — **CLOSED, see "Fase de compatibilidad de precios" below** (previously an open question; a concrete removal path is now defined instead of an indefinite dual source of truth).
- **Capacidades vs. atributos — two deliberately separate layers**, so a "basic" category needs zero code while a "specialized" one has a clear, narrow extension point:
  1. `Category.capabilities` — a small, **fixed, code-known** Zod schema (`requiresColor, allowsLensType, allowsTreatments, allowsPrescription, allowsPrescriptionAttachment, allowsLensTint, allowsFrameSelection`, booleans only — see "Capacidades tipadas" for the finalized schema/defaults). This gates which quote-wizard steps and admin-form sections exist. An admin can toggle these values for a category but cannot invent a new capability key without a code change — this is the explicit "needs development" boundary from §13.
  2. `CategoryAttributeDefinition` / `ProductOfferingAttributeValue` — the **admin-extensible** layer. A future category (e.g. "Lentes deportivos" needing a "nivel de protección UV" filter) defines a new attribute row from `/admin/categories`, with zero migration and zero new enum. This is the mechanism that makes "add a basic category with zero development" literally true.
  A single `configuration: Json?` blob on `ProductOffering` was considered for *both* concerns and rejected: capabilities need to be trusted, code-referenced booleans (safe to gate server-side authorization-style logic on — see "Cotizador configurable" below); attributes need to be filterable in SQL, which a loose JSON blob can't do efficiently or safely (see next point).
- **Typed columns over raw JSON for attribute values**: `ProductOfferingAttributeValue` uses `valueText/valueNumber/valueBoolean` instead of one `Json value` column specifically so `filterable` attributes can be indexed and queried with plain `WHERE` clauses (`valueNumber = @indexed`), not JSON-path queries — see "Rendimiento."
- **`RANGE` is a NUMBER filter presentation, not a separate storage shape**: an attribute typed `RANGE` stores its per-offering value in `valueNumber` exactly like `NUMBER`; `type: RANGE` only tells the filter UI to render a min/max slider instead of an exact-match control. Documented here because the user's own list placed it as a peer of `text/number/boolean/select/multi_select`, which reads as a fifth storage shape if not clarified.
- **`ProductOffering.deletedAt` (soft delete)**, mirroring `Request`'s existing pattern, so disabling an offering that has historical `Request.details` snapshots never needs a hard delete.

### Capacidades tipadas (Zod, no condicionales dispersos) — **CLOSED**

Schema y nombres de campo finales (en inglés, por consistencia con el resto del código TypeScript del proyecto):

```ts
// modules/catalog/category-capabilities.ts (design sketch, not implemented here)
export const categoryCapabilitiesSchema = z.object({
  /// El armazón/producto requiere seleccionar un ProductColor.
  requiresColor: z.boolean().default(true),
  /// Habilita el paso "tipo de cristal" (Monofocal/Bifocal/Multifocal/...).
  allowsLensType: z.boolean().default(false),
  /// Habilita el paso de tratamientos (antirreflejo, filtro azul, etc.).
  allowsTreatments: z.boolean().default(false),
  /// Habilita la pregunta "¿tienes receta óptica vigente?" (Sí/No/No estoy seguro).
  allowsPrescription: z.boolean().default(false),
  /// Habilita el sub-paso de adjuntar el archivo de receta (drag-and-drop,
  /// bucket privado, RequestAttachment) — ver nota de dependencia abajo.
  allowsPrescriptionAttachment: z.boolean().default(false),
  /// Habilita el paso de tinte/color del cristal (lentes de sol ópticos).
  allowsLensTint: z.boolean().default(false),
  /// Indica si el paso "producto/oferta" se presenta como selección de un
  /// armazón concreto (true, el caso de las tres categorías iniciales) o
  /// como un selector de producto genérico para una categoría futura que
  /// no se basa en elegir un armazón (p. ej. "Accesorios").
  allowsFrameSelection: z.boolean().default(true),
});
export type CategoryCapabilities = z.infer<typeof categoryCapabilitiesSchema>;
```

**Defaults**: el perfil por defecto (`requiresColor: true, allowsFrameSelection: true`, todo lo demás `false`) es deliberadamente el perfil de Armazones — la categoría más simple. Una categoría nueva creada sin configurar explícitamente sus capacidades se comporta como un listado de producto simple, en vez de exponer accidentalmente pasos de cristal/tratamientos/receta/tinte que nadie pidió — mismo principio de "fail closed" ya aplicado a la lectura de JSON malformado.

**Dependencia `allowsPrescriptionAttachment` ⊂ `allowsPrescription`**: el sub-paso de adjuntar archivo solo tiene sentido si el paso "¿tienes receta?" existe. El schema no fuerza esto con una validación cruzada (mantiene cada capability como un booleano independiente y simple); en su lugar, la lógica de pasos activos del cotizador (`STEP_DEFINITIONS`, ver "Precios y cotizador configurable") calcula el paso de adjunto como activo únicamente cuando **ambas** `allowsPrescription && allowsPrescriptionAttachment` son verdaderas. Una categoría con `allowsPrescriptionAttachment: true` pero `allowsPrescription: false` simplemente nunca muestra el paso de adjunto — no es un error, es la combinación tratada como "sin efecto".

**Valores iniciales de las tres categorías (CERRADO — sin cambios permitidos sin una decisión explícita posterior):**

| Capability | Armazones | Lentes ópticos | Lentes de sol ópticos |
|---|---|---|---|
| `requiresColor` | `true` | `true` | `true` |
| `allowsLensType` | `false` | `true` | `true` |
| `allowsTreatments` | `false` | `true` | `true` |
| `allowsPrescription` | `false` | `true` | `true` |
| `allowsPrescriptionAttachment` | `false` | `true` | `true` |
| `allowsLensTint` | `false` | `false` | `true` |
| `allowsFrameSelection` | `true` | `true` | `true` |

Every read of `Category.capabilities` (JSON column) is parsed through this schema before use — the same "validate at the boundary, never trust a JSON column as pre-shaped" discipline already used for `Request.details` in this codebase. A category whose stored JSON fails validation is treated as capabilities-empty (fail closed: no optional steps shown) rather than throwing into a public page.

### Rediseño del catálogo público

Routes:
- `/catalogo` — category picker (cards/tabs), pulled from `Category` (`active: true, visible: true`, ordered by `sortOrder`) — never hardcoded to the three initial categories in JSX.
- `/catalogo/[categorySlug]` — offering list + filters (common + dynamic), replacing today's flat product list.
- `/catalogo/[categorySlug]/[offeringSlug]` — offering detail, replacing today's `[slug]` product detail.

**Compatibilidad de URLs**: `/catalogo/[slug]` is kept as a route that:
1. Looks up `Product` by `slug` (existing lookup, unchanged).
2. Resolves that product's "default" offering: the Armazones offering if visible, else the first `visible: true` offering ordered by `sortOrder`.
3. Issues a permanent redirect (`308`, via `redirect()`/`permanentRedirect()`) to `/catalogo/[categorySlug]/[offeringSlug]`.
4. If the product has no visible offering at all, preserves today's `notFound()` (404) behavior.

Old filter query strings (`/catalogo?brand=vespa&gender=MUJER`) redirect to the same params against the Armazones category (`/catalogo/armazones?brand=vespa&gender=MUJER`), since that's the only category every existing link could possibly have meant.

**Tarjetas y ficha**: `ProductCard`-equivalent now renders from a `CatalogOfferingView` (offering-first DTO: category, brand, product name, price-from-or-"Cotizar", colors, availability, badge, category-appropriate CTA label — "Ver armazón" / "Configurar lentes" / "Configurar lentes de sol ópticos", sourced from `Category.name`/a small CTA-label map, not hardcoded per product). The offering detail page adds a "También disponible como: [otras categorías del mismo Product]" cross-link block, resolved via the `(productId)` index on `ProductOffering`.

### Estrategia de filtros

Common filters (`brand, audience/gender, shape, material, color, price, availableOnly, q`) keep their existing Zod validation and Prisma query patterns from `modules/catalog/schemas.ts`/`repository.ts`, now always scoped by `categoryId` first (`ProductOffering.category.slug = :categorySlug AND active AND visible`, joined to `Product`).

Dynamic filters, one category at a time:
1. Load that category's `CategoryAttributeDefinition` rows where `active: true, filterable: true`.
2. Build a Zod schema **at request time** from those definitions (`buildCategoryFilterSchema(definitions)`) — not one static schema shared by every category.
3. Parse `searchParams` against common-filter schema + that dynamic schema; any key not covered by either is silently dropped (same lenient philosophy as today's `parseCatalogFilters`).
4. Translate an accepted dynamic filter into a Prisma `some` clause against `ProductOfferingAttributeValue` **only via the resolved `attributeDefinitionId`** (looked up server-side from the DB-stored `key`) — never by interpolating the browser-supplied key into a Prisma field path. This is the concrete anti-injection guarantee requested in §8: the allowlist is the set of `key`s that actually exist as `CategoryAttributeDefinition` rows for that category, re-checked on every request, not a client-trusted list.

### Precios y cotizador configurable

Catalog/detail price always reads `ProductOffering.priceFromClp` (nullable → "Cotizar"). The quote wizard becomes one component driven by an ordered, filtered step list:

```ts
const STEP_DEFINITIONS = [
  { id: 'category', always: true },
  { id: 'offering', always: true },       // pick a Product within the category, or "advice"; copy/UX varies by allowsFrameSelection
  { id: 'color', capability: 'requiresColor' },
  { id: 'glassType', capability: 'allowsLensType' },
  { id: 'tint', capability: 'allowsLensTint' },
  { id: 'treatments', capability: 'allowsTreatments' },
  { id: 'prescription', capability: 'allowsPrescription' },
  { id: 'prescriptionAttachment', capabilities: ['allowsPrescription', 'allowsPrescriptionAttachment'] }, // active only when BOTH are true
  { id: 'contact', always: true },
  { id: 'summary', always: true },
] as const;
// activeSteps = STEP_DEFINITIONS.filter(s => {
//   if (s.always) return true;
//   if (s.id === 'prescriptionAttachment') return category.capabilities.allowsPrescription && category.capabilities.allowsPrescriptionAttachment;
//   return category.capabilities[s.capability];
// })
```

This directly satisfies "un flujo reutilizable y basado en configuración, no tres componentes independientes." The existing prescription-attachment step (private bucket upload, `RequestAttachment`, signed-URL admin access, sanitization/magic-byte verification) is reused **completely unchanged** — it's simply gated on `allowsPrescription && allowsPrescriptionAttachment` instead of always shown (see the dependency note in "Capacidades tipadas").

**Autorización de capacidades server-side**: `submitQuote`'s successor re-resolves, in order: `categoryId → Category` (active/visible) → `offeringId → ProductOffering` (must belong to that category, active/visible) → `offering.productId → Product` (visible) → `colorId → ProductColor` (must belong to that product). Any capability-gated field the client sends (glassType, treatments, tint, prescription, prescription attachment) is **only persisted/emailed if the resolved category's `capabilities` actually allow it** — a client claiming `allowsPrescription`/`allowsPrescriptionAttachment` for a category that doesn't grant it is not trusted, mirroring the existing "never trust client-sent color id, always look up the row" discipline already in this codebase.

`Request.details` gains (additive JSON keys, no schema migration): `categoryId, categoryName, categorySlug, offeringId, productId, productName, productCode, brandId, brandName, productColorId, productColorName, priceFromSnapshot` (the resolved `ProductOffering.priceFromClp` at submission time — a permanent snapshot, never re-derived), plus the existing `glassType, treatments, treatmentLabels, tint (when applicable), prescriptionAnswer`. Because these are captured once at submission and never recomputed, a later category/offering/price edit cannot alter a historical request's displayed values — the same immutability guarantee `Request.details` already provides for `frameProductColorHex` today.

Emails (`modules/notifications/email/templates/quote-*.ts`) and the WhatsApp message copy gain the category/offering fields as additional rows/lines, following the exact existing pattern (escaped, no secrets, no storageKey — see `request-category-snapshot` spec). The admin request inbox (`modules/requests/admin-*`) gains a category filter alongside the existing type/status/date filters.

### `ProductOffering.configuration` — **CLOSED**

Scope, closed (previously an open question): `configuration` exists **only** for structured commercial options that (a) are specific to one offering, (b) are not filterable/searchable, and therefore (c) do not warrant a `CategoryAttributeDefinition`/`ProductOfferingAttributeValue` row. It is never a substitute for a stable column, and never treated as arbitrary/untyped JSON — every read and write goes through a **versioned** Zod schema, exactly like `Category.capabilities`.

```ts
// modules/catalog/offering-configuration.ts (design sketch, not implemented here)
const offeringConfigurationV1Schema = z.object({
  version: z.literal(1),
  /// Optional free-form commercial note shown only in the admin panel
  /// (e.g. "incluye estuche rígido"), never a filter, never on the public card.
  internalMerchandisingNote: z.string().max(300).optional(),
  /// Optional structured price breakdown for future use (e.g. showing
  /// "armazón + cristales" as two named components under one priceFrom) —
  /// unused by any of the three initial categories.
  priceComponents: z
    .array(z.object({ label: z.string().max(60), amountClp: z.number().int().nonnegative() }))
    .max(5)
    .optional(),
});
export const offeringConfigurationSchema = z.discriminatedUnion('version', [offeringConfigurationV1Schema]);
```

**Ejemplos válidos:**
- `{ "version": 1, "internalMerchandisingNote": "Incluye paño de limpieza premium" }`
- `{ "version": 1, "priceComponents": [{ "label": "Armazón", "amountClp": 19990 }, { "label": "Cristales ópticos", "amountClp": 20000 }] }`
- `{ "version": 1 }` (todo opcional; una oferta sin necesidades especiales no necesita configuration en absoluto — puede quedar `null`)

**Ejemplos inválidos (rechazados por el schema, nunca persistidos):**
- `{ "featured_color": "azul" }` — esto es un atributo filtrable/mostrable; pertenece a `CategoryAttributeDefinition`/`ProductOfferingAttributeValue`, no a `configuration`.
- `{ "version": 2, "algo": "nuevo" }` sin que exista todavía un `offeringConfigurationV2Schema` en el discriminated union — una versión no reconocida se rechaza, no se guarda "tal cual".
- `{ "priceFromClp": 19990 }` — duplicaría la columna estable `ProductOffering.priceFromClp`; nunca se guarda un valor ya representado por una columna real.
- Cualquier valor que no sea un objeto JSON plano validado (arrays sueltos, strings crudos, HTML, etc.).

Ningún consumidor en v1 (público) necesita leer `configuration` todavía — queda reservado para las tres categorías iniciales, y su primer uso real llegará junto con la primera categoría/funcionalidad que efectivamente lo necesite.

### Fase de compatibilidad de precios (`Product.priceFromClp` → `ProductOffering.priceFromClp`) — **CLOSED**

(En este documento, "priceFrom" en prosa se refiere siempre a este mismo campo — el nombre de columna Prisma se mantiene `priceFromClp`, consistente con la convención ya usada en `Product.priceFromClp`, en vez de introducir un nombre de columna nuevo sin sufijo de moneda.)

`ProductOffering.priceFromClp` es la única fuente de verdad comercial para todo lo que el público ve (catálogo, ficha de oferta, cotizador, correos, WhatsApp, schema SEO `Offer`). `Product.priceFromClp` **no se elimina en este cambio** — entra en una fase de compatibilidad explícita y temporal:

1. **Durante la migración**: cada producto `visible: true` genera su `ProductOffering` de categoría Armazones usando `Product.priceFromClp` como valor inicial de `priceFromClp` (ver "Migración de datos").
2. **Durante la fase de compatibilidad**: `Product.priceFromClp` permanece como columna `NOT NULL` sin cambios — el formulario admin de producto lo sigue exigiendo al crear/editar el modelo base (evita una migración disruptiva de datos existentes y de la validación ya probada de `product-management`). Su rol pasa a ser exclusivamente el de **valor semilla para la primera oferta de un producto nuevo** — el copy del formulario admin se actualiza para dejar esto explícito ("precio de referencia inicial — el precio público real se administra por categoría en 'Disponibilidad en el catálogo'").
3. **Todas las lecturas públicas se actualizan**: catálogo, ficha de oferta, resumen del cotizador, plantillas de correo (HTML y texto), copy de WhatsApp, y el schema `Offer` de SEO leen exclusivamente `ProductOffering.priceFromClp` desde el momento en que existen ofertas — ninguno vuelve a leer `Product.priceFromClp` para mostrarlo públicamente.
4. **Todas las escrituras se actualizan**: crear/editar una oferta escribe únicamente su propio `ProductOffering.priceFromClp`; no existe una sincronización automática continua entre `Product.priceFromClp` y las ofertas ya creadas — after the initial seed, they intentionally diverge, porque el precio de "lente óptico" legítimamente difiere del precio de "solo armazón" para el mismo producto.
5. **Eliminación del campo antiguo — en una migración POSTERIOR, no en esta**: una vez que (a) todo producto visible tiene al menos una `ProductOffering`, y (b) una búsqueda en el código confirma cero referencias restantes a `Product.priceFromClp` fuera del seed histórico, un cambio de limpieza posterior puede volver la columna nullable y luego eliminarla. Este cambio (`redesign-extensible-catalog-v2`) **no la elimina** — evita mantener dos fuentes de verdad *indefinidamente* al dejar un criterio de salida concreto y verificable, en vez de dejarlo abierto sin plan.

### Administración

- **`/admin/categories`** (new): list/create/edit/reorder/activate-deactivate/edit-slug-description-SEO-capabilities-attributes. **SUPERADMIN-only** for all of these, per explicit instruction — this is the "no-code extensibility" lever and is gated more tightly than routine catalog work.
- **Deleting a category with offerings**: blocked, mirroring the already-shipped `removeProductColor` pattern (`{status:'blocked', offeringCount}` instead of a silent/forced delete) — "preferir desactivación" reuses an established UX/API shape from this same codebase rather than inventing a new one.
- **Product form** gains a "Disponibilidad en el catálogo" section: per active category, a toggle + price-from + commercial title/description + featured + sort + attribute values + SEO. **ADMIN-permitted** (not SUPERADMIN-only) — see "Autorización" below.
- Product creation flow becomes: (1) base model — name/code/brand/colors/photos, exactly as today — then (2) select categories to offer it in and configure each `ProductOffering` — making the physical-model vs. commercial-offer distinction visible in the UI, not just in the schema.

### Autorización — **CLOSED**

Split final, sin ambigüedad, verificado siempre server-side (nunca solo ocultando UI en el cliente):

- **SUPERADMIN-only** (estructura): crear, editar, ordenar, activar/desactivar `Category`; editar `capabilities`; crear/editar/desactivar `CategoryAttributeDefinition` (estructura de filtros dinámicos). Esta es la palanca de "extensibilidad sin código" y se protege con `requireRole('SUPERADMIN')`.
- **ADMIN y SUPERADMIN** (mercadeo rutinario): crear y editar `ProductOffering` para productos existentes (activar/desactivar por categoría, precio, copy comercial, destacado, orden, valores de atributos ya definidos, SEO por oferta) — protegido con `requireSession()` (cualquier admin activo), el mismo nivel de confianza que ya tienen las mutaciones de color/imagen de producto hoy.
- Esta división resuelve la pregunta abierta previa ("¿ProductOffering requiere SUPERADMIN?"): **no**, cualquier ADMIN activo puede administrar ofertas; solo la estructura de categorías/capacidades/atributos requiere SUPERADMIN.

### Migración de datos

1. Seed the three categories idempotently (`prisma.category.upsert({where:{slug}, ...})`), mirroring the existing `Brand` seed pattern (`getBrandLogos()` → upsert-by-slug) — small, hardcoded TS array for these three *initial* categories only; every category after these three is created through `/admin/categories`, never through the seed script.
2. For every currently-`visible: true` `Product` without an existing `(productId, categoryId=armazones)` row, create one `ProductOffering`: `priceFromClp = product.priceFromClp` (the one-time seed read of the legacy field — see "Fase de compatibilidad de precios"), `slug = product.slug` (preserves the exact current public slug), `active: true`, `visible: product.visible`. Idempotent via `upsert` on `(productId, categoryId)`.
3. **Do not** auto-create lentes-ópticos/lentes-de-sol-ópticos offerings for any product — that remains an explicit admin decision per product, per the business's own instruction.
4. Nothing about `Product`, `ProductColor`, `ProductImage`, `Brand`, `Request`, `RequestAttachment`, admin users, sessions, or audit entries is altered, duplicated, or deleted by this migration.
5. Photos already in MinIO are untouched — `ProductOffering` never references storage directly, only `Product` does (unchanged).

### SEO

- Each `ProductOffering` gets its own canonical URL and, when `seoTitle`/`seoDescription` are unset, falls back to a category-aware template (e.g. `"${product.name} — ${category.name} | Pepi Visión 360"`) rather than reusing the bare product name for every category — this is the deliberate anti-duplicate-content measure requested in §14: the same `Product` appearing under two categories must render two distinct `<title>`/meta description pairs, not identical ones.
- `BreadcrumbList` JSON-LD: Home → Catálogo → Category → Offering.
- `ItemList` JSON-LD on `/catalogo/[categorySlug]` for the visible offerings.
- `Product`/`Offer` JSON-LD on the offering detail page, `offers.price` populated only when `priceFromClp` is non-null (a null price never renders a fake `$0` offer schema).
- Sitemap: one entry per `active: true, visible: true` `Category`, one entry per `active: true, visible: true` `ProductOffering`, plus a permanent redirect entry (not a duplicate content entry) for legacy `/catalogo/[slug]` paths.

### Rendimiento

Indexes already declared above: `ProductOffering(categoryId, visible)`, `ProductOffering(productId)`, unique `(productId, categoryId)` and `(categoryId, slug)`; `CategoryAttributeDefinition(categoryId, filterable)`; `ProductOfferingAttributeValue(attributeDefinitionId, valueText)` and `(attributeDefinitionId, valueNumber)`. Catalog listing always filters by `categoryId` first (high selectivity, mirrors the existing brand-join query shape already shipped without a measured issue). Listings paginate (`take`/`skip`, consistent with a follow-up performance task) rather than loading every offering in a category into memory; dynamic-filter matching happens in the Prisma query (`some: { attributeDefinitionId, valueText/valueNumber }`), never post-fetch in application memory.

### Auditoría y seguridad

New audit actions, following the exact existing `recordAudit()` shape (`actorId, action, targetType, targetId, metadata`): `category.created`, `category.updated`, `category.enabled`, `category.disabled`, `category.attributes_updated`, `offering.created`, `offering.updated`, `offering.enabled`, `offering.disabled`. Metadata stays minimal (ids and changed-field names, never full JSON blobs, never secrets/files) — the same discipline already applied to `product.color_added`/`product.image_uploaded` etc.

Authorization: `requireRole('SUPERADMIN')` for all category-structure mutations (category, capabilities, attribute definitions); `requireSession()` (any active admin) for offering mutations — see "Autorización" above for the closed decision this implements.

### Secuencia con `add-pepi-vision-360-v1` — **CLOSED**

`openspec/specs/` has no archived capabilities yet — `add-pepi-vision-360-v1` is still in-flight. This is now a firm sequencing decision, not just a design preference:

- **`redesign-extensible-catalog-v2` SHALL be implemented only after `add-pepi-vision-360-v1` is completed and archived.** No task in this change's `tasks.md` starts before that archival.
- This proposal **does not modify** `add-pepi-vision-360-v1`'s artifacts (`proposal.md`, `design.md`, `tasks.md`, or its `specs/`) and **does not archive it automatically** — archiving that change remains a separate, explicit action taken independently of this proposal.
- Once archived, `Product`/`ProductColor`/`ProductImage`/`Brand`/`Request`/`RequestAttachment` as they exist in `openspec/specs/` at that point become the concrete base this change builds on; nothing here is designed against a hypothetical or moving target.
- This change is written to **extend**, not fight, `add-pepi-vision-360-v1`'s `product-catalog`/`product-management`/`quote-requests` capabilities: `Product`/`ProductColor`/`ProductImage`/`Brand` are reused verbatim, and every new capability introduced here is additive.

## Risks / Trade-offs

- **[Risk]** Two large in-flight OpenSpec changes could drift or conflict if implemented out of order. → **[Mitigation, CLOSED]** Firm sequencing decision (see "Secuencia con `add-pepi-vision-360-v1`"): this change is implemented only after `add-pepi-vision-360-v1` is completed and archived, never interleaved or auto-modified/auto-archived by this proposal.
- **[Risk]** `ProductOffering.configuration` could silently become a dumping ground for data that should have been a proper attribute or column. → **[Mitigation]** Versioned Zod schema with a small, explicit allowed shape (see "`ProductOffering.configuration`"); anything filterable/displayable belongs in `CategoryAttributeDefinition` instead, and the design doc lists concrete invalid examples precisely to make this reviewable in code review.
- **[Risk]** Keeping `Product.priceFromClp` and `ProductOffering.priceFromClp` side by side for a compatibility period could drift into two permanent, inconsistent sources of truth. → **[Mitigation, CLOSED]** Explicit exit criterion defined (see "Fase de compatibilidad de precios"): the legacy field is removed in a later, separate migration once every visible product has an offering and zero code references remain — not left open-ended.
- **[Risk]** Category-scoped offering slugs mean the same slug string legitimately resolves to different content depending on the category segment. → **[Mitigation]** Canonical URLs are always the full 3-segment path; nothing in the design treats an offering slug as unique on its own.
- **[Risk]** JSON `capabilities`/`options` columns can't be filtered on efficiently at the DB level. → **[Mitigation]** They're never queried inside SQL — read wholesale per category (small, infrequently-changing) and validated via Zod at the boundary. Anything that genuinely needs SQL-level filtering (attribute values) is deliberately modeled as typed columns instead, not JSON.
- **[Risk]** Admins could create confusingly similar category names/slugs over time. → **[Mitigation]** Reuses the exact slugify + unique-index + "prefer deactivation" pattern already proven for `Brand`.
- **[Risk]** Wrapping the prescription-attachment step inside a capability gate could regress its security model if reimplemented carelessly. → **[Mitigation]** The design calls for reusing `modules/storage/private-service.ts`/`RequestAttachment`/signed-URL admin access completely unchanged — zero new file-handling code, only a new gate on whether the step is shown/persisted.
- **[Risk]** An extra `Product → ProductOffering → Category` join on every public catalog query. → **[Mitigation]** Indexed, category-first-filtered, and structurally identical to the already-shipped `Product → Brand` join with no observed performance issue.
- **[Risk]** Scope size — public catalog, quote wizard, admin product form, and emails all change. → **[Mitigation]** tasks.md is phased into 10 independently reviewable phases (per the user's own requested order), so no single PR needs to land the whole redesign at once.

## Migration Plan

0. **Precondition (CLOSED — see "Secuencia con `add-pepi-vision-360-v1`"): `add-pepi-vision-360-v1` is completed and archived before step 1 begins.**
1. Apply the new-tables-only Prisma migration (`Category`, `ProductOffering`, `CategoryAttributeDefinition`, `ProductOfferingAttributeValue`, `CategoryAttributeType` enum) — purely additive, no existing table altered. `Product.priceFromClp` is untouched (still `NOT NULL`, unchanged validation) per the price-compatibility decision.
2. Run the idempotent category seed (capabilities table from "Capacidades tipadas"), then the idempotent Armazones-offering seed for every currently-visible product, copying `Product.priceFromClp` into each new `ProductOffering.priceFromClp` once.
3. Ship the offering-aware catalog/cotizador/admin code with `/catalogo/[slug]` as a redirect layer. All public price reads switch to `ProductOffering.priceFromClp` at this point (see "Fase de compatibilidad de precios").
4. Manually verify every previously-published product URL still resolves (now via redirect) before considering any old code path removable — part of tasks.md's final validation phase.
5. **Rollback**: since step 1 only adds tables and steps 2–3 only add rows/redirect logic (nothing existing is altered or dropped), rolling back is a plain code revert; the additive tables can remain unused harmlessly, or be dropped via a follow-up down migration if ever desired. No data-loss risk to `Product`/`Request`/`Brand`/existing images.
6. **Follow-up, separate change (not part of this migration)**: once every visible product has at least one `ProductOffering` and no code references `Product.priceFromClp` outside the historical seed, a later cleanup change makes the column nullable and then removes it.

## Open Questions

Only two questions remain genuinely open (all others from the prior draft — SUPERADMIN/ADMIN split, `configuration`'s shape, `Product.priceFromClp` deprecation path, and the `add-pepi-vision-360-v1` sequencing — are now closed decisions documented above):

- Exact copy for the new "¿Qué deseas cotizar?" first wizard step needs a business/marketing pass before implementation.
- Should the legacy `/catalogo/[slug]` redirect be silent (308) or show a brief "este modelo ahora vive en..." interstitial? (This design assumes a silent permanent redirect.)
