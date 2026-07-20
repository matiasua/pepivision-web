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
- Not attempting to auto-populate a Lentes de sol offering for existing products (explicit business decision — only Lentes ópticos offerings are auto-created by the migration; see "Taxonomía definitiva de categorías" and "Migración de datos: dos categorías").
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
  /// string across its own offerings (/catalogo/lentes-opticos/coral and
  /// /catalogo/lentes-de-sol/coral both existing is the expected case).
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

### Taxonomía definitiva de categorías — **CLOSED (reemplaza la tabla de tres categorías original)**

**Decisión definitiva del propietario del producto (no derivable de Graphify ni de heurísticas del grafo — ver "Fase 5" más abajo para el porqué de este cambio):** el catálogo tendrá **únicamente dos categorías comerciales**:

1. **Lentes ópticos** — copy aprobado: *"Elige tu armazón y personalízalo con los cristales que necesitas según tu receta y estilo de vida."* Incluye armazones destinados a incorporar cristales ópticos; permite seleccionar armazón, color, tipo de cristal, tratamientos, opciones adicionales y receta.
2. **Lentes de sol** — copy aprobado: *"Descubre lentes de sol con protección UV, opciones polarizadas y modelos graduables según tu receta."* Incluye modelos solares sin graduación y graduables; puede ofrecer UV400, polarizado, cristales graduables, solares monofocales, solares progresivos, degradado, espejado.

**Se elimina del diseño futuro:**
- **Armazones** como categoría. Un armazón sigue existiendo — es el `Product` físico, sin cambios — pero deja de tener una categoría comercial propia. Se vuelve el producto físico seleccionable dentro de **Lentes ópticos** (ver "Relación conceptual" abajo).
- **Lentes de sol ópticos** como nombre/categoría separada de "Lentes de sol" — se fusiona en la categoría única **Lentes de sol**, que ahora cubre tanto los modelos sin graduación como los graduables.

**Relación conceptual (sin ambigüedad entre categoría, producto físico, tipo de cristal, tratamiento y opción adicional):**

- **`Category`** — exactamente dos filas: Lentes ópticos, Lentes de sol. Sigue sin ser un enum Prisma (mismo razonamiento que antes: son filas administrables, no un conjunto cerrado de código).
- **`Product`** — representa el armazón/modelo físico. Conserva marca, colores e imágenes exactamente como hoy — **sin cambios**. Puede publicarse mediante `ProductOffering` en una o ambas categorías, cuando sea compatible (p. ej. un modelo apto tanto para uso óptico como para venderse como lente de sol).
- **`ProductOffering`** — representa la publicación comercial de un `Product` dentro de una `Category`: precio, copy comercial y configuración de la oferta. **No duplica** imágenes, colores ni marca — exactamente el mismo contrato ya implementado en la Fase 3, sin cambios de forma.
- **Tipo de cristal, tratamiento, opción adicional** — no son categorías ni productos: son *contenido de configuración de la oferta/cotización*, ver "Compatibilidades del cotizador" más abajo. Nunca se modelan como una `Category` ni como un `Product` distinto.

### Capacidades tipadas (Zod, no condicionales dispersos) — **CLOSED, esquema base sin cambios; ver "Compatibilidades del cotizador" para la extensión estructurada**

Schema y nombres de campo finales (en inglés, por consistencia con el resto del código TypeScript del proyecto) — **sin cambios respecto al ya implementado en `modules/catalog/category-capabilities.ts`**:

```ts
// modules/catalog/category-capabilities.ts (ya implementado, Fase 1)
export const categoryCapabilitiesSchema = z.object({
  /// El armazón/producto requiere seleccionar un ProductColor.
  requiresColor: z.boolean().default(true),
  /// Habilita el paso "tipo de cristal" (Monofocal/Bifocal/Progresivo/...).
  allowsLensType: z.boolean().default(false),
  /// Habilita el paso de tratamientos (antirreflejo, filtro azul, etc.).
  allowsTreatments: z.boolean().default(false),
  /// Habilita la pregunta "¿tienes receta óptica vigente?" (Sí/No/No estoy seguro).
  allowsPrescription: z.boolean().default(false),
  /// Habilita el sub-paso de adjuntar el archivo de receta (drag-and-drop,
  /// bucket privado, RequestAttachment) — ver nota de dependencia abajo.
  allowsPrescriptionAttachment: z.boolean().default(false),
  /// Habilita el paso de tinte/color del cristal (lentes de sol).
  allowsLensTint: z.boolean().default(false),
  /// Indica si el paso "producto/oferta" se presenta como selección de un
  /// armazón concreto (true, el caso de las dos categorías definitivas) o
  /// como un selector de producto genérico para una categoría futura que
  /// no se basa en elegir un armazón (p. ej. "Accesorios").
  allowsFrameSelection: z.boolean().default(true),
});
export type CategoryCapabilities = z.infer<typeof categoryCapabilitiesSchema>;
```

**Defaults**: el perfil por defecto (`requiresColor: true, allowsFrameSelection: true`, todo lo demás `false`) sigue siendo el perfil más simple posible (equivalente al antiguo perfil "Armazones") — una categoría nueva creada sin configurar explícitamente sus capacidades se comporta como un listado de producto simple, en vez de exponer accidentalmente pasos de cristal/tratamientos/receta/tinte que nadie pidió. Este default ya no corresponde a ninguna categoría seed existente (ninguna de las dos categorías definitivas usa el perfil "todo false"), pero se mantiene como el valor de fábrica seguro para una categoría futura (p. ej. "Accesorios").

**Dependencia `allowsPrescriptionAttachment` ⊂ `allowsPrescription`**: sin cambios — el sub-paso de adjuntar archivo solo tiene sentido si el paso "¿tienes receta?" existe. Ver detalle ya documentado (sin cambios de comportamiento).

**Valores de las dos categorías definitivas (CERRADO — reemplaza la tabla de tres categorías; sin cambios permitidos sin una decisión explícita posterior):**

| Capability | Lentes ópticos | Lentes de sol |
|---|---|---|
| `requiresColor` | `true` | `true` |
| `allowsLensType` | `true` | `true` |
| `allowsTreatments` | `true` | `true` |
| `allowsPrescription` | `true` | `true` (graduables) |
| `allowsPrescriptionAttachment` | `true` | `true` |
| `allowsLensTint` | `false` | `true` |
| `allowsFrameSelection` | `true` | `true` |

Nota: Lentes de sol mantiene `allowsPrescription`/`allowsPrescriptionAttachment` en `true` porque la categoría cubre tanto modelos sin graduación como graduables (ver "Compatibilidades del cotizador" — la pregunta de receta sigue existiendo, pero solo es relevante si el visitante elige una modalidad graduada).

Every read of `Category.capabilities` (JSON column) is parsed through this schema before use — the same "validate at the boundary, never trust a JSON column as pre-shaped" discipline already used for `Request.details` in this codebase. A category whose stored JSON fails validation is treated as capabilities-empty (fail closed: no optional steps shown) rather than throwing into a public page.

### Contenido de cristales, tratamientos y opciones adicionales — **CLOSED (capability `lens-configuration`)**

Esta sección resuelve un contenido que Graphify no puede decidir (no es una relación derivable del código o del grafo — proviene directamente de los requerimientos del propietario del producto) y que hasta ahora no tenía representación estructurada: qué tipos de cristal, tratamientos y opciones adicionales existen, qué significan, y cuáles aplica cada categoría.

**Decisión de modelado**: igual que "Capacidades vs. atributos" ya establece para el resto del catálogo, aquí también se evita un sistema EAV genérico. El catálogo de tipos/tratamientos/opciones es **contenido de negocio fijo y pequeño** (no algo que un admin necesite crear libremente), así que se modela como **constantes de código, versionadas y validadas por Zod** — igual que `GLASS_TYPES`/`TREATMENT_IDS` ya existen hoy en `modules/requests/schemas.ts` — más un **allowlist por categoría** (qué subconjunto de ese catálogo fijo aplica a cada categoría), que sí vive en `Category.capabilities` porque varía por categoría y debe validarse server-side.

**Terminología definitiva — renombrar `Multifocal` → `Progresivo`:**

| Nombre anterior | Nombre definitivo |
|---|---|
| Monofocal | Monofocal (sin cambio) |
| Bifocal | Bifocal (sin cambio) |
| **Multifocal** | **Progresivo** |

Ocurrencias exhaustivas de "Multifocal" identificadas en esta pasada (referencia para la implementación futura, ninguna se modifica en este cambio documental):
`modules/requests/schemas.ts:13` (`GLASS_TYPES`, el valor canónico persistido), `components/quote/QuoteWizard.tsx:34` (label del wizard — su *descripción* ya dice "Progresivo", solo la clave/valor sigue siendo `Multifocal`), `app/cristales/page.tsx:24-25,38,109`, `app/faq/page.tsx:25-26`, `app/catalogo/[categorySlug]/[offeringSlug]/page.tsx:113`, `modules/catalog/category-capabilities.ts:13` (comentario), `docs/page-inventory.md:14`, `e2e/public/forms.spec.ts:104` (string literal clickeado), `openspec/specs/public-site/spec.md:48` (baseline, no se edita en este cambio), `openspec/changes/archive/2026-07-14-add-pepi-vision-360-v1/specs/public-site/spec.md:44` (archivado, no se edita).

**Riesgo de compatibilidad histórica**: `Request.details.glassType` ya persistido con el valor literal `"Multifocal"` en filas existentes es un snapshot inmutable de lo que era cierto al momento del envío (mismo principio ya aplicado en `request-category-snapshot`) — el renombre solo aplica a **nuevas** solicitudes desde que el enum cambie; una fila histórica con `"Multifocal"` no se reescribe ni se migra.

**Catálogo definitivo de tipos de cristal (código, `modules/requests/lens-types.ts` — implementado en la Fase 7 de este cambio, contenido/tabla/copy únicamente; el motor de compatibilidades sigue sin implementar, ver más abajo):**

```ts
export const LENS_TYPES = ['monofocal', 'bifocal', 'progresivo'] as const;
export const LENS_TYPE_LABELS: Record<(typeof LENS_TYPES)[number], string> = {
  monofocal: 'Monofocal',
  bifocal: 'Bifocal',
  progresivo: 'Progresivo',
};
export const LENS_TYPE_DESCRIPTIONS: Record<(typeof LENS_TYPES)[number], string> = {
  monofocal: 'Corrigen una sola distancia visual según las necesidades indicadas en tu receta.',
  bifocal: 'Permiten ver de lejos y de cerca mediante dos zonas diferenciadas en un mismo cristal.',
  progresivo: 'Ofrecen una transición gradual para ver de lejos, a distancia intermedia y de cerca, sin líneas visibles.',
};
```
`monofocal` además admite una submodalidad opcional (`lejos | intermedia | cerca`) — no cambia su `id`, es un dato adicional del mismo tipo, no una cuarta opción de `LENS_TYPES`.

**Tabla comparativa definitiva** (debe ser accesible: no depender únicamente de ✓/—/color — usar texto "Sí"/"No" o iconografía con `aria-label`, ver `improve-visual-identity-and-content`):

| Característica | Monofocal | Bifocal | Progresivo |
|---|---|---|---|
| Una sola distancia de visión | Sí | No | No |
| Lejos y cerca en un mismo cristal | No | Sí | Sí |
| Visión intermedia continua | No | No | Sí |
| Línea divisoria visible | No | Sí | No |
| Transición gradual entre distancias | No | No | Sí |

**Catálogo definitivo de tratamientos** (`TREATMENTS`, código — implementado en `modules/requests/treatments-content.ts`): Antirreflejo · Filtro de luz azul-violeta · Fotocromático · Protección UV · Mayor resistencia a rayaduras. **No usar la afirmación "completamente antirrayas"** — el tratamiento aumenta resistencia, no la hace absoluta; el copy debe decir "mayor resistencia a rayaduras."

**(NUEVO — iteración correctiva de interfaz de `/cristales`, misma Fase 7, no una fase nueva) Retiro de "Hidrofóbico y oleofóbico":** decisión comercial del propietario del producto — Pepi Visión no ofrece hoy este tratamiento, así que se retiró por completo de `TREATMENTS` y de la interfaz pública de `/cristales`. No es un error técnico ni una omisión de scope; es una corrección de catálogo. El total definitivo de tratamientos pasa de 6 a **5**. No afecta datos históricos (`Request.details` nunca persistió este valor como enum técnico — el catálogo de tratamientos siempre fue de solo lectura/presentación, sin un `TREATMENT_IDS` persistido por solicitud) ni los specs archivados/baseline (`openspec/specs/`, `openspec/changes/archive/`), que no se tocan. Si el negocio decide reintroducirlo en el futuro, requiere una decisión de producto explícita nueva, no una reversión automática de este retiro.

**Catálogo definitivo de opciones adicionales** (`ADDITIONAL_OPTIONS`, código — implementado en `modules/requests/additional-options.ts`, deliberadamente separado de "tratamientos" porque son decisiones estructurales del cristal, no un recubrimiento): Cristales de alto índice · Polarizado · Degradado · Espejado · Cristales solares graduados. "Cristales solares graduados" es en sí mismo una submodalidad con tres variantes: solar monofocal, solar progresivo, polarizado graduado (esta última solo cuando exista compatibilidad, ver tabla siguiente).

**Compatibilidades del cotizador por categoría — fuente estructurada, validada server-side (extiende `Category.capabilities` con un bloque `quoteOptions`, diseño no implementado aún — deliberadamente diferido a la Fase 9, motor de compatibilidades; la Fase 7 solo implementó el contenido/tabla/copy de `LENS_TYPES`/`TREATMENTS`/`ADDITIONAL_OPTIONS`, sin ningún gating por categoría todavía):**

```ts
// modules/catalog/quote-options.ts (design sketch, not implemented here)
const quoteOptionsSchema = z.object({
  version: z.literal(1),
  lensTypes: z.array(z.enum(LENS_TYPES)),
  treatments: z.array(z.enum(TREATMENT_IDS)),
  additionalOptions: z.array(z.enum(ADDITIONAL_OPTION_IDS)),
}).strict();
```

| | Lentes ópticos | Lentes de sol |
|---|---|---|
| **Tipos de cristal** | Monofocal, Bifocal, Progresivo | Sin graduación, Solar monofocal, Solar progresivo |
| **Tratamientos y opciones** | Antirreflejo, Filtro azul-violeta, Fotocromático, Protección UV, Mayor resistencia a rayaduras, Alto índice | UV400, Polarizado, Degradado, Espejado, Solar graduado, Mayor resistencia a rayaduras |

**Reglas de validación (SHALL, ver spec `lens-configuration`):**
- El cotizador **nunca** debe mostrar una opción no listada en el `quoteOptions` de la categoría resuelta.
- La validación se repite **server-side** en la resolución de la solicitud (mismo punto que ya re-resuelve categoría/oferta/producto/color, ver "Precios y cotizador configurable") — el cliente no puede enviar manualmente una combinación no permitida (p. ej. `lentesTipo: 'progresivo'` para una categoría cuyo `quoteOptions.lensTypes` no lo incluye) y tenerla persistida o enviada por correo.
- Esto es una capa más fina que las `capabilities` booleanas existentes: `allowsLensType: true` sigue gating *si el paso existe*; `quoteOptions.lensTypes` gating *cuáles opciones aparecen dentro de ese paso*. Ambas capas se validan server-side, nunca solo una.

**(NUEVO — Fase 9, motor de compatibilidades: dos contradicciones internas de este documento detectadas y corregidas antes de implementar, cada una con una regla única y observable):**

1. **El sketch de `quoteOptionsSchema` de arriba contradice la fila "Tipos de cristal" de la tabla.** `z.array(z.enum(LENS_TYPES))` solo puede validar `monofocal`/`bifocal`/`progresivo` — no puede representar "Sin graduación, Solar monofocal, Solar progresivo" para Lentes de sol, porque esos tres valores nunca fueron definidos como IDs estables en ningún archivo (`modules/requests/lens-types.ts` — Fase 7 — solo define el catálogo de `/cristales`, que es exclusivamente óptico, y no debe tocarse en la Fase 9 para no alterar esa GUI ya aprobada).
   **Regla:** se introduce un catálogo nuevo, propio de la Fase 9 (no de la Fase 7), de IDs estables para las modalidades de Lentes de sol — `sin-graduacion`, `solar-monofocal`, `solar-progresivo` — en `modules/catalog/quote-options.ts`. El campo `lensTypes` de `quoteOptionsSchema` pasa a validar contra la unión `LENS_TYPES ∪ {sin-graduacion, solar-monofocal, solar-progresivo}`, no solo `LENS_TYPES`. Esto no reabre ni modifica `modules/requests/lens-types.ts` ni `/cristales` — son IDs adicionales, en un módulo distinto, sin efecto visual.
2. **"UV400" (fila Lentes de sol) no tiene ID estable en el catálogo fijo.** `modules/requests/treatments-content.ts` (Fase 7, ya cerrado y probado — `TREATMENTS.toHaveLength(5)`) solo define `proteccion-uv` ("Protección UV"). No existe ningún ID `uv400` en el código.
   **Regla (CORREGIDA — ver "Cierre técnico de la Fase 9" más abajo):** la resolución original de este documento (tratar "UV400" como un alias del mismo ID `proteccion-uv`) quedó **revertida** por decisión explícita del propietario del producto: `uv400` es un ID estable e **independiente** de `proteccion-uv`, nunca un alias ni una transformación automática. Ambos representan hechos comerciales distintos (protección UV general vs. la certificación específica de bloqueo hasta 400nm propia del rubro de lentes de sol) y deben declararse por separado — una oferta nunca puede afirmarse "UV400" solo por tener `proteccion-uv`. `uv400` se define en `modules/catalog/quote-options.ts` (`SOLAR_TREATMENT_IDS`), no en `modules/requests/treatments-content.ts` — mismo criterio que la corrección #1: un catálogo nuevo, propio de la Fase 9, sin tocar el catálogo público de `/cristales` (Fase 7, cerrado). Lentes ópticos solo admite `proteccion-uv`; Lentes de sol solo admite `uv400`; ninguna categoría admite ambos.

**Regla de graduación por modalidad (nueva, Fase 9 — resuelve "exigir/impedir graduación según la modalidad" del motor de validación):** `sin-graduacion` es, por definición y nombre, la única modalidad que **excluye** graduación — una selección con `lensType: 'sin-graduacion'` y receta/graduación solicitada es rechazada. Las cinco modalidades restantes (`monofocal`, `bifocal`, `progresivo`, `solar-monofocal`, `solar-progresivo`) **requieren** graduación — todas son, por definición, cristales correctivos.

**Combinación "polarizado graduado" (aclaración, no un ID nuevo):** no se modela como una cuarta opción adicional — es simplemente el estado en que `additionalOptions` incluye a la vez `solar-graduado` y `polarizado` dentro de Lentes de sol; el motor de compatibilidades SHALL tratar esa combinación como válida (nunca contradictoria), consistente con la nota de `ADDITIONAL_OPTIONS` sobre las tres variantes de "solares graduados".

**(NUEVO — cierre técnico de la Fase 9, tres riesgos resueltos antes de consolidar):**

1. **Auditoría de las categorías reales.** El motor se implementó correctamente, pero las dos filas `Category` reales (`lentes-opticos`, `lentes-de-sol`) fueron sembradas el 2026-07-15, antes de que `quoteOptions` existiera en el schema — `seedCategories()` usa `update: {}` deliberadamente (protege ediciones admin), así que nunca las tocó retroactivamente. `getCategoryLensOptions()` contra la base real devolvía la allowlist vacía (fail-closed) para ambas categorías hasta que se ejecutó la reconciliación descrita abajo.
2. **Reconciliación explícita, idempotente, nunca desde un request público** — `modules/catalog/quote-options-reconciliation.ts` (`reconcileCanonicalQuoteOptions()`, invocable también como comando standalone vía `npm run catalog:reconcile-quote-options`, y ahora integrada al final de `seedCategories()`, que ya se ejecuta de forma idempotente en seed/tests): por categoría, (a) si `quoteOptions` está ausente, agrega la matriz canónica preservando cualquier otra clave de `capabilities`; (b) si existe y es válido, lo preserva sin tocarlo (nunca pisa una edición administrativa); (c) si existe pero es inválido, lo reporta como conflicto explícito y **nunca** lo sobrescribe silenciosamente. Nunca crea categorías (eso sigue siendo responsabilidad exclusiva de `seedCategories()`) ni toca `name`/`shortDescription`/`imagePath`/`sortOrder`/`active`/`visible`, ni hace backfill de `Product`/`ProductOffering`. Cada escritura es un único `update()` atómico sobre el objeto `capabilities` completo — nunca queda un estado parcial.
3. **`uv400` como ID independiente de `proteccion-uv`** — ver corrección #2 más arriba. Se agregó además `ProductOffering.configuration.lensOptionExclusions` (`modules/catalog/offering-configuration.ts`, campo opcional dentro del mismo `offeringConfigurationV1Schema`, sin cambio de versión): una lista de IDs de tratamientos/opciones adicionales que esa oferta puntual **excluye** de lo que su categoría permitiría (p. ej. un modelo de lentes de sol sin certificación `uv400`). Es exclusivamente sustractivo — nunca puede ampliar la matriz de la categoría, por construcción (`getEffectiveOfferingLensOptions` solo resta IDs del resultado de la categoría, nunca agrega ninguno) — así que "una oferta no puede ampliar la matriz de su categoría" no requiere validación cruzada adicional, es estructuralmente imposible de expresar con este mecanismo.

**Open Question (no resuelta por este cambio — requiere decisión del propietario del producto):** ¿puede un cliente cotizar únicamente el armazón sin cristales ópticos dentro de la categoría Lentes ópticos (equivalente al antiguo flujo "Armazones"), o el tipo de cristal es un paso obligatorio una vez que se elige esa categoría? Esto determina si `allowsLensType`/`allowsTreatments`/`allowsPrescription` deben poder saltarse dentro de Lentes ópticos o si son siempre obligatorios. Ver "Open Questions" al final de este documento.

**(NUEVO — iteración correctiva de interfaz de `/cristales`, misma Fase 7):** el contenido óptico de la primera pasada de la Fase 7 era correcto, pero su presentación visual no cumplía el estándar de marca de Pepi Visión (jerarquía plana, tarjetas idénticas, iconografía de placeholder con una sola letra). Se corrigió exclusivamente la capa de presentación, sin tocar el modelo de contenido salvo el retiro de "Hidrofóbico y oleofóbico" documentado arriba:
- Nuevos íconos de línea en `components/icons.tsx`, siguiendo exactamente la convención ya existente (`viewBox 24×24`, `stroke="currentColor"`, `aria-hidden`) — no es una dependencia nueva, son más funciones en el mismo archivo compartido. Ningún ícono nuevo pertenece todavía a la ilustración final de `improve-visual-identity-and-content`.
- Sin paleta nueva: se reutilizan los tokens de marca ya definidos en `app/globals.css` (navy, fucsia, fondos suaves, radios, sombras).
- Se corrigió un defecto real de contraste AA detectado por la corrida completa de axe (no por pruebas unitarias, que no calculan contraste real renderizado): el texto de la insignia "Opción adicional" (`text-fucsia` sobre el fondo suave `#fdeaf4`) medía 4.47:1, bajo el mínimo 4.5:1 — se ajustó a un tono más oscuro de la misma familia (`#b30f68`, ~5.73:1) sin cambiar el fondo ni la insignia "Tratamiento" (que ya pasaba).
- La tabla comparativa y el listado de tratamientos/opciones adicionales mantienen exactamente el mismo contenido funcional aprobado en la primera pasada de la Fase 7 — solo cambió su contenedor, jerarquía visual y densidad.

**(NUEVO — segunda iteración correctiva de interfaz de `/cristales`, misma Fase 7; el propietario del producto rechazó el resultado estético de la iteración anterior pese a que 7.9 pasaba todos los tests automatizados — ver CLAUDE.md → "GUI acceptance gate", regla 7):**
- Diagnóstico del propietario: el contenido óptico era correcto, pero la página "se sentía como documentación técnica presentada en tarjetas" — específicamente el bloque "Tratamientos principales", una grilla de 6 tarjetas visualmente idénticas (icono + badge + texto, todas del mismo tamaño y forma) que no se leía como una página comercial de óptica.
- Corrección: el bloque "Tratamientos principales" se reescribió de una grilla de 6 tarjetas independientes a un único contenedor con dos columnas de filas (icono + nombre + badge + descripción) separadas por divisores internos — mismo contenido, misma información por ítem, pero sin repetir el mismo "molde de tarjeta" seis veces. Esto también diferencia visualmente esta sección de "Opciones para lentes de sol" (que conserva el formato de tarjeta, ya que allí solo hay 4 ítems y vive en su propio contenedor con acento de marca), en vez de que ambas secciones se vean como la misma grilla repetida.
- El hero se complementó con una fila breve de tres propuestas de valor (tipos de cristal disponibles, tratamientos/opciones para sol, cotización por WhatsApp) para que no se perciba como "título + párrafo centrado" — texto derivado del contenido ya aprobado en la página, sin ninguna afirmación nueva.
- Se corrigió además una referencia residual a "Hidrofóbico y oleofóbico" en `specs/lens-configuration/spec.md` (dos escenarios de la Fase 9, no tocados por la primera iteración correctiva) que quedó inconsistente con el retiro documentado arriba — el catálogo definitivo de tratamientos sigue siendo 5, sin excepción, en todas las fuentes (código, delta spec, design).
- Sin cambios de paleta, de contenido óptico, ni de dependencias — mismos tokens de marca, misma iconografía esquemática de `components/icons.tsx`.
- Validación GUI manual pendiente de aprobación explícita del propietario antes de consolidar/archivar la Fase 7 (ver tasks.md → 7.10).

### Rediseño del catálogo público

Routes:
- `/catalogo` — category picker (cards/tabs), pulled from `Category` (`active: true, visible: true`, ordered by `sortOrder`) — never hardcoded to the three initial categories in JSX.
- `/catalogo/[categorySlug]` — offering list + filters (common + dynamic), replacing today's flat product list.
- `/catalogo/[categorySlug]/[offeringSlug]` — offering detail, replacing today's `[slug]` product detail.

**Compatibilidad de URLs — actualizado para dos categorías (CLOSED, reemplaza el default "Armazones")**: `/catalogo/[slug]` is kept as a route that:
1. Looks up `Product` by `slug` (existing lookup, unchanged).
2. Resolves that product's "default" offering. **`armazones` no longer exists as a category**, so `findDefaultPublicOfferingForProductSlug`'s current hardcoded preference (`offerings.find(o => o.category.slug === 'armazones') ?? offerings[0]`) must change. New default policy: prefer the `lentes-opticos` offering if visible (since a bare frame migrates there — see "Migración de datos: dos categorías"), else the first `visible: true` offering ordered by `sortOrder` (covers a frame offered only under `lentes-de-sol`).
3. Issues a permanent redirect (`308`, via `redirect()`/`permanentRedirect()`) to `/catalogo/[categorySlug]/[offeringSlug]`.
4. If the product has no visible offering at all, preserves today's `notFound()` (404) behavior.

**Slugs de categoría legados (bare, 2 segmentos) — CLOSED, cierre técnico posterior a la implementación inicial**: distinto del caso anterior (que resuelve un *producto* bajo un segmento de categoría inválido), una solicitud a `/catalogo/armazones` o `/catalogo/lentes-de-sol-opticos` **sin** segmento de oferta no tiene ningún producto que resolver — es simplemente la página de listado de una categoría retirada. La regla general "slug de categoría desconocido → 404" (`catalog-navigation`) no aplica a estos dos identificadores específicos: quedan **reservados** y redirigen permanentemente a su reemplazo mediante un mapa cerrado y estático (`armazones` → `lentes-opticos`, `lentes-de-sol-opticos` → `lentes-de-sol`, `modules/catalog/legacy-slugs.ts#resolveLegacyCategorySlug`), resuelto **antes** del fallback de `Product.slug` en `app/catalogo/[categorySlug]/page.tsx` — así ningún `Product.slug` coincidente puede capturar uno de estos dos identificadores. El mapa nunca consulta la base de datos ni el input del visitante como destino (sin riesgo de open redirect); ver spec `catalog-navigation` → "Retired category slugs redirect permanently to their replacement category" para el detalle normativo.

Old filter query strings (`/catalogo?brand=vespa&gender=MUJER`) redirect to the same params against the `lentes-opticos` category (`/catalogo/lentes-opticos?brand=vespa&gender=MUJER`) by the same reasoning — it's the category every pre-migration frame link now defaults to.

**Tarjetas y ficha**: `ProductCard`-equivalent now renders from a `CatalogOfferingView` (offering-first DTO: category, brand, product name, price-from-or-"Cotizar", colors, availability, badge, category-appropriate CTA label, sourced from `Category.name`/a small CTA-label map, not hardcoded per product). **CTA-label map, updated for two categories** (`modules/catalog/labels.ts#CATEGORY_CTA_LABELS`, currently hardcoded to the three old slugs including `armazones`):

```ts
const CATEGORY_CTA_LABELS: Record<string, string> = {
  'lentes-opticos': 'Configurar lentes',
  'lentes-de-sol': 'Configurar lentes de sol',
};
const DEFAULT_OFFERING_CTA_LABEL = 'Ver oferta';
```

The offering detail page adds a "También disponible como: [otras categorías del mismo Product]" cross-link block, resolved via the `(productId)` index on `ProductOffering` — unchanged mechanism, now practically a Lentes ópticos ↔ Lentes de sol cross-link instead of a three-way one.

### Estrategia de filtros

Common filters (`brand, audience/gender, shape, material, color, price, availableOnly, q`) keep their existing Zod validation and Prisma query patterns from `modules/catalog/schemas.ts`/`repository.ts`, now always scoped by `categoryId` first (`ProductOffering.category.slug = :categorySlug AND active AND visible`, joined to `Product`).

Dynamic filters, one category at a time:
1. Load that category's `CategoryAttributeDefinition` rows where `active: true, filterable: true`.
2. Build a Zod schema **at request time** from those definitions (`buildCategoryFilterSchema(definitions)`) — not one static schema shared by every category.
3. Parse `searchParams` against common-filter schema + that dynamic schema; any key not covered by either is silently dropped (same lenient philosophy as today's `parseCatalogFilters`).
4. Translate an accepted dynamic filter into a Prisma `some` clause against `ProductOfferingAttributeValue` **only via the resolved `attributeDefinitionId`** (looked up server-side from the DB-stored `key`) — never by interpolating the browser-supplied key into a Prisma field path. This is the concrete anti-injection guarantee requested in §8: the allowlist is the set of `key`s that actually exist as `CategoryAttributeDefinition` rows for that category, re-checked on every request, not a client-trusted list.

### Fase 12 — implementación real de los filtros dinámicos — **CLOSED**

El sketch anterior se implementó casi literal, con dos ajustes de nombres respecto al pseudocódigo original: `selectFilterableAttributes()` (no `buildCategoryFilterSchema` — no se construye un Zod `z.object` dinámico en runtime; en su lugar, `parseDynamicFilters()` itera las definiciones ya filtradas y valida cada valor con lógica explícita por `CategoryAttributeType`, lo que evita generar y cachear un schema Zod por categoría en cada request sin ganar nada a cambio) y `parseDynamicFilters()` (el parser combinado). Ambos viven en `modules/catalog/dynamic-filters.ts`, un módulo puro sin Prisma, mismo patrón que `modules/catalog/quote-options.ts` de la Fase 9.

**Convención de query param**: todo filtro dinámico usa el prefijo `attr_` (`attr_<key>`, y `attr_<key>_min`/`attr_<key>_max` para `RANGE`) — decisión nueva, no estaba en el sketch original. Necesaria porque una `key` de atributo es administrable libremente por un SUPERADMIN (`categoryAttributeFormSchema` solo exige `^[a-z0-9_-]+$`) y podría coincidir textualmente con un filtro común ya existente (`color`, `brand`, `q`, etc.), lo que produciría una colisión silenciosa de query params sin el prefijo.

**Semántica por tipo** (`CategoryAttributeType` tiene 6 valores; los 6 se soportan en el parser/consulta, pero el control de UI dedicado en `CatalogFilters.tsx` solo se construyó para los 4 con un patrón de filtro comercial reconocible):
- `SELECT` → chips-link de valor único (mismo patrón visual que Marca).
- `MULTI_SELECT` → checkboxes reales, semántica OR entre los valores elegidos. **Corregido en el cierre operativo (12.8)**: la consulta original usaba `{ valueText: { in: [...] } }`, que nunca puede calzar contra el valor realmente almacenado — un único array JSON serializado en `valueText` (forzado por `@@unique([offeringId, attributeDefinitionId])`, que impide una fila por valor seleccionado; ver comentario del schema Prisma). La consulta correcta es un `OR` de `valueText: { contains: JSON.stringify(valor) }` por cada valor seleccionado — `JSON.stringify` aporta las comillas que delimitan el valor dentro del array, evitando falsos positivos por coincidencia parcial de substring.
- `BOOLEAN` → en el catálogo público, un checkbox único; solo `"1"` es representable en la URL (ausencia = "no filtra", nunca "false" explícito). En el editor admin (12.8) el control es tri-estado (No definido/Sí/No) porque ahí sí importa distinguir "el administrador dijo que no" de "nadie ha cargado este dato".
- `RANGE` → dos inputs numéricos + botón "Aplicar"; `min`/`max` son independientes (se puede fijar solo uno), y "mínimo > máximo" descarta el filtro completo sin romper la página.
- `NUMBER`/`TEXT` → **decisión Opción B, cerrada en 12.8**: ninguno de los dos puede marcarse `filterable: true` — bloqueado server-side en el único punto de escritura (`categoryAttributeFormSchema.refine()`), reforzado en `selectFilterableAttributes()`, y reflejado en el formulario admin (checkbox deshabilitado + texto explicativo). Se descartó la Opción A (construir controles públicos para ambos) porque RANGE ya cubre "filtrar por un valor numérico" reutilizando la misma columna `valueNumber`, y TEXT filtrable implicaría búsqueda de texto libre por atributo, no autorizada por ninguna spec vigente. Ambos tipos siguen siendo válidos como atributos puramente informativos (`visibleInDetail`), solo nunca como filtro público.

**Opciones de filtro mostradas**: se usa literalmente `CategoryAttributeDefinition.options` (la lista declarada por el admin), nunca "solo los valores que alguna oferta pública usa actualmente" — mismo criterio que `GENDER_OPTIONS`/`SHAPE_OPTIONS`/`MATERIAL_OPTIONS` ya usan (universo declarado, no "en uso"). Esto satisface literalmente el escenario de la spec ("una definición `filterable: true` se vuelve usable de inmediato, sin cambio de código") sin una consulta adicional de "valores en uso" que la spec tampoco exige.

**Gap encontrado en la revisión previa de esta fase — resuelto en el cierre operativo (12.8), ver sección siguiente.**

### Fase 12 — cierre operativo (12.8) — **CLOSED**

Auditoría de datos reales al inicio de esta pasada (solo lectura, cualquier entorno): 0 filas en `CategoryAttributeDefinition` y 0 en `ProductOfferingAttributeValue`. Confirma el gap señalado arriba en la práctica: el feature de filtros dinámicos nunca tuvo datos reales — no existía ningún camino de administración para asignar valores de `ProductOfferingAttributeValue` a una oferta concreta, solo las *definiciones* de atributo tenían CRUD admin. Sin esa vía, un atributo filtrable recién creado no podía tener ninguna oferta real que lo usara sin editar PostgreSQL directamente.

`specs/catalog-administration/spec.md` ya exigía esta capacidad ("el editor de producto DEBE incluir... valores de atributo, sin duplicar colores ni fotografías") — no era una tarea nueva inventada en esta pasada, sino un requisito de spec ya vigente que 12.1–12.7 había dejado sin implementar por acotar esa fase al lado público. La instrucción de esta pasada fue explícita en no dejarlo como corrección futura si OpenSpec ya lo exigía, así que se implementó aquí.

**Diseño**: capacidad acotada dentro del editor existente de `ProductOffering` (`ProductOfferingsManager.tsx`), no un módulo admin paralelo — un bloque colapsable "Atributos de \<categoría\>" por oferta habilitada, cargado bajo demanda (`OfferingAttributesEditor.tsx`). Capa de servicio nueva y única (`modules/catalog/offering-attribute-service.ts`) sobre un repositorio (`offering-attribute-repository.ts`, `replaceOfferingAttributeValues()` transaccional) y un schema Zod `.strict()` (`offering-attribute-schemas.ts`).

**Reglas fail-closed** (autoritativas, ver también el propio código):
- La categoría de la oferta se resuelve siempre server-side desde `ProductOffering.categoryId` — nunca se confía en una categoría enviada por el cliente.
- Todo `attributeDefinitionId` del payload debe pertenecer a esa categoría real; si no, se rechaza **toda** la actualización (no solo esa entrada) — es una acción admin autenticada, no un query param público tolerante, así que el fallo es ruidoso, no silencioso.
- `attributeDefinitionId` duplicado en el mismo payload se rechaza (ambiguo).
- La forma del valor enviado debe calzar exactamente con el tipo real de la definición (nunca `multiValues` para un SELECT, ni `numberValue` para un TEXT, etc.) — validado explícitamente antes de cualquier escritura.
- SELECT/MULTI_SELECT se validan contra `options` cuando la definición los declara.
- MULTI_SELECT se normaliza (dedupe + orden alfabético estable) antes de serializar a JSON en `valueText`.
- BOOLEAN distingue tres estados reales: `true` (fila con `valueBoolean: true`), `false` explícito (fila con `valueBoolean: false`) y "sin definir" (sin fila) — un valor `null`/ausente en el payload se interpreta como retiro explícito del valor, nunca como `false`.
- Un valor "vacío" (string vacío, array vacío, `null`) para cualquier tipo se interpreta como "el administrador retiró este valor" → `DELETE`, no un `UPSERT` con valor vacío.
- Toda la escritura (deletes + upserts) ocurre en una única transacción Prisma — un valor inválido en el mismo submit revierte el conjunto completo, nunca una escritura parcial.

**Cambio de categoría de una oferta**: confirmado imposible por diseño — `offeringFormSchema` nunca incluye `productId`/`categoryId` en una edición, reforzado por `@@unique([productId, categoryId])`. No se implementó lógica de migración/limpieza de valores por cambio de categoría porque ese estado nunca es alcanzable; cubierto por una prueba que confirma la restricción, no por código nuevo.

**Definición desactivada/eliminada**: `onDelete: Cascade` en ambas relaciones de `ProductOfferingAttributeValue` (`offering`, `attributeDefinition`) — eliminar una definición o una oferta borra automáticamente sus valores dependientes; no hay estado huérfano alcanzable a nivel de base de datos. El editor admin sí puede mostrar/limpiar el valor de una definición ya desactivada (no filtra por `active` al leer, a diferencia del lado público, que sí exige `active && filterable`).

**Bug real encontrado y corregido en el mismo cierre**: ver el ajuste de `MULTI_SELECT` más arriba en esta sección — `buildAttributeValueConditions()` nunca podía calzar contra el formato de almacenamiento real, así que el filtro público de MULTI_SELECT jamás habría funcionado con datos reales aunque el resto de 12.1–12.7 pasara todas sus pruebas (las pruebas previas solo ejercitaban escenarios de un único valor donde la coincidencia parcial de substring del código viejo funcionaba por coincidencia). Corregido y cubierto por una prueba de integración nueva contra PostgreSQL real que falla contra el código anterior.

Auditoría vía la acción admin real (no SQL directo) demuestra el flujo completo: crear una definición → marcarla filtrable → editar una oferta sintética → asignar un valor desde el servicio real → el filtro aparece en `getCatalogForCategory()` → aplicarlo devuelve la oferta correcta y excluye las demás → editar el valor cambia el resultado → retirarlo lo hace desaparecer → fixtures limpiados (`tests-integration/offering-attribute-values.test.ts`).

### Fase 13 — emails y WhatsApp consumiendo el snapshot — **CLOSED**

Revisión previa confirmó que categoría/marca/modelo/color ya llegaban a `quoteCustomerConfirmation()`/`quoteBusinessNotification()` desde antes de esta fase (implementado junto con la Fase 9/10, no como parte de la Fase 11) — el gap real y único era el precio: `priceFromSnapshot` ya se resolvía server-side en `submitQuote` (usado para construir `Request.details`) pero nunca se pasaba a ninguna de las dos plantillas.

**Contrato de precio en ambas plantillas**: se agregó `priceFromSnapshot: number | null` (un valor primitivo, nunca un objeto `Request`/`ProductOffering`/snapshot completo) a `QuoteCustomerConfirmationInput`/`QuoteBusinessNotificationInput`. Una fila "Precio referencial: Desde $X" (`formatClp()`, mismo formateador que catálogo/cotizador) se inserta entre "Color" y "Tipo de cristal" en HTML y texto plano; se omite por completo — nunca "$0", "Por cotizar" ni "—" — cuando `priceFromSnapshot` es `null` (flujo de asesoría sin `ProductOffering`). Ambos call-sites en `submitQuote` pasan la misma variable local ya resuelta arriba, nunca un recálculo ni `Product.priceFromClp`.

**Mensaje de WhatsApp — reescrito, no solo extendido**: antes de esta fase, el mensaje se construía *dentro* de la rama `catalog` de `submitQuote`, **antes** de resolver el tipo de cristal (`lensModalityLabel` se resuelve más abajo en la función) — nunca podía mencionar la modalidad, y la ruta de asesoría (sin oferta) nunca reasignaba `whatsappHref`, quedándose con el texto genérico fijo del inicio de la función. Se extrajo la construcción a un módulo puro nuevo, `modules/requests/whatsapp-message.ts` (`buildQuoteWhatsAppMessage()`, sin Prisma, mismo patrón que `modules/catalog/dynamic-filters.ts` — permite probarlo unitariamente sin arrastrar la cadena de dependencias de `service.ts`), invocado una única vez desde `submitQuote` **después** de que categoría, marca/modelo/color, tipo de cristal y precio ya están resueltos — cubre catálogo y asesoría con la misma llamada. Cada segmento (marca+modelo+color, tipo de cristal, precio) se omite por completo cuando no aplica; nunca `categorySlug`/`offeringId`/`productId` como texto, nunca datos del adjunto.

**Inmutabilidad**: ningún email ni mensaje de WhatsApp se regenera o reenvía para una solicitud ya persistida — esta fase solo afecta la construcción de mensajes en el momento de una solicitud nueva. Un cambio posterior de precio/categoría no reenvía ni altera correos ya entregados.

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

### Fase 10 — implementación real del cotizador configurable — **CLOSED**

El sketch de `STEP_DEFINITIONS` arriba se implementó como `computeActiveSteps()` (`components/quote/QuoteWizard.tsx`), con tres desviaciones deliberadas respecto al sketch original, todas ya anticipadas por el resto de este documento:

1. **El paso `tint` del sketch nunca se implementó como paso independiente** — quedó superado por el paso `additionalOptions` (10.3, nuevo, no existía en el diseño de tres categorías): las opciones de tinte de Lentes de sol (degradado, espejado) viven ahí junto con polarizado/alto índice/solar graduado, porque todas comparten la misma naturaleza ("decisión estructural del cristal, opcional, no un tratamiento superficial") y la misma UI (checkbox + badge "Opción adicional"). Mantener `tint` como paso séptimo separado habría creado una tercera clasificación redundante con `additionalOptions` para un subconjunto de las mismas opciones.
2. **`prescriptionAttachment` exige además `hasPrescription === 'Sí'`**, no solo las dos capabilities. El sketch original (línea `capabilities: ['allowsPrescription', 'allowsPrescriptionAttachment']`) describía correctamente las precondiciones *estructurales* (la categoría lo permite) pero omitía la precondición *de estado* (el visitante efectivamente respondió que sí tiene receta) — mismo criterio que ya exige `submitQuote` server-side. Esta omisión produjo un defecto real: el paso de adjunto se mostraba incondicionalmente en cuanto la categoría permitía prescripción+adjunto, incluso tras responder "No"/"No estoy seguro" — detectado únicamente al ejecutar el flujo completo en un navegador real (Playwright), no por ninguna prueba unitaria/de componente previa a esa corrida. Corregido agregando el parámetro `hasPrescription` a `computeActiveSteps()`; se agregaron 2 pruebas de regresión en `tests/quote-wizard.test.tsx`.
3. **Resolución de id→label ocurre exclusivamente en el servidor, nunca en el cliente.** El cliente envía y mantiene en estado únicamente IDs de dominio estables (`monofocal`, `antirreflejo`, `uv400`, nunca sus labels) — cumple el requerimiento de esta fase de no mezclar label/ID en el estado del wizard. Inmediatamente antes de persistir, `submitQuote` resuelve cada ID a su label legible vía `getLensModalityLabel`/`getTreatmentLabel`/`getAdditionalOptionLabel` (todas del motor puro de la Fase 9) y escribe el resultado en `Request.details` — esto evita cualquier cambio en `RequestCard.tsx` o en las plantillas de correo, que ya esperaban labels legibles, no IDs.

**Segundo defecto real encontrado en la misma corrida de navegador**: al entrar al cotizador desde una ficha de oferta pública (`initialOffering` ya resuelto server-side por `app/cotizador/page.tsx`), el wizard igual arrancaba en el paso 1 ("Categoría") en vez de saltar directo al paso "Modelo", y el `<select>` de ese paso no tenía las opciones cargadas para mostrar la oferta ya elegida. Corregido con `useState(initialOffering ? 1 : 0)` para el índice inicial más un `useEffect` de una sola ejecución (deps vacías) que precarga `offeringOptions` cuando hay `initialOffering`. Cubierto por el flujo E2E "abre el cotizador desde la ficha de un producto" (`e2e/public/forms.spec.ts`).

### Fase 10 — iteración correctiva de UX (previa a solicitar la aprobación GUI final) — **CLOSED**

La primera revisión GUI de la Fase 10 dejó dos hallazgos sin corregir, ambos resueltos en esta iteración antes de pedir la aprobación visual definitiva del propietario (10.10 sigue pendiente de esa aprobación explícita — esta iteración no la otorga, solo la habilita):

1. **Indicador de progreso ilegible en mobile a partir de 8 pasos.** El nav de progreso (`<nav aria-label="Progreso del cotizador">`) usaba `flex-1` + `overflow-x-auto` para distribuir los círculos de paso; en el breakpoint móvil (390px), con 8+ pasos activos (el caso estándar del flujo óptico y solar-graduado, no un caso extremo), el ancho disponible por rótulo se reducía lo suficiente para que el último rótulo ("Resumen") quedara recortado en el borde del viewport, sin ninguna señal visual de que el nav fuera desplazable horizontalmente.
   **Decisión**: en vez de reducir texto, abreviar nombres, encoger la tipografía o agregar un scroll horizontal sin indicación (todas explícitamente descartadas), el stepper completo se mantiene sin cambios pero se oculta bajo el breakpoint `sm` (`hidden sm:flex` — sigue siendo la experiencia en desktop/tablet, incluido tablet 768px, donde el espacio ya alcanza), y se agrega un **indicador compacto exclusivo de mobile** (`sm:hidden`): "Paso X de Y" + el nombre completo del paso activo (nunca abreviado) + una barra `role="progressbar"` con `aria-valuemin`/`aria-valuemax`/`aria-valuenow`/`aria-valuetext` (el total y la posición se recalculan en cada cambio de `steps`/`stepIndex`, nunca un valor fijo). Ambas variantes leen la misma `steps` — resultado de `computeActiveSteps()` — nunca una segunda lista de pasos independiente; la única diferencia es de presentación (círculos numerados vs. texto + barra), gated por CSS, no por lógica duplicada. El relleno de la barra usa `transition-[width] duration-300` con `motion-reduce:transition-none` — el ritmo de reproducción de esa transición fue precisamente lo que produjo una falsa alarma durante esta misma revisión (una captura tomada milisegundos después de un clic mostraba el relleno todavía en su ancho anterior, no el nuevo); confirmado mediante `boundingBox()` que el ancho final renderizado sí coincide con el `aria-valuenow`/total real una vez asentada la transición — no se trataba de un defecto del componente, sino de no esperar la animación antes de leer el DOM.
2. **Avance automático inconsistente al elegir categoría.** `selectCategory()` llamaba `setStepIndex(1)` inmediatamente al seleccionar una categoría, saltando al paso "Modelo" sin que el visitante presionara "Continuar" — inconsistente con el resto de los pasos de selección única del wizard (elección de modelo, tipo de cristal, respuesta de receta), que sí exigen ese clic explícito. **Decisión**: `selectCategory()` ya solo actualiza el estado (categoría elegida + limpieza de selecciones dependientes obsoletas, igual que antes) y nunca cambia de paso; el botón "Continuar" del paso de categoría queda `disabled` mientras no haya ninguna categoría seleccionada (antes solo mostraba un mensaje de error al hacer clic sin selección — ahora, además, es imposible hacer ese clic inválido). Efecto colateral corregido junto con esto: el aviso "Cambiaste a... se reiniciaron..." ya no aparece en la primera selección (cuando no existía una categoría previa que "cambiar"), solo en selecciones posteriores que sí reemplazan una elección anterior. La entrada con oferta ya resuelta (`initialOffering`, ficha de producto) no se modificó — sigue arrancando directo en el paso "Modelo" vía su propio `useState` inicial, un mecanismo independiente del de `selectCategory()`.

Cobertura agregada: 6 pruebas de componente nuevas en `tests/quote-wizard.test.tsx` (estado `disabled`/`enabled` de "Continuar", ausencia de avance automático, `aria-valuemax`/`aria-valuenow`/`aria-valuetext` correctos y actualizándose con la modalidad, rótulos completos del stepper de escritorio) y un spec E2E nuevo y dedicado, `e2e/public/quote-wizard-mobile.spec.ts` (viewport 390×844 real vía Playwright, no jsdom — los tres flujos completos, ausencia de scroll horizontal, y un caso de navegación por teclado: `Space` en un radio enfocado habilita "Continuar" sin avanzar solo, `Enter` sobre "Continuar" sí avanza).

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

1. **Durante la migración**: cada producto `visible: true` sin ofertas previas genera su `ProductOffering` de categoría Lentes ópticos usando `Product.priceFromClp` como valor inicial de `priceFromClp`; un producto que ya tenía una oferta bajo la extinta categoría `armazones` la conserva remapeada, no duplicada (ver "Migración de datos: dos categorías").
2. **Durante la fase de compatibilidad**: `Product.priceFromClp` permanece como columna `NOT NULL` sin cambios — el formulario admin de producto lo sigue exigiendo al crear/editar el modelo base (evita una migración disruptiva de datos existentes y de la validación ya probada de `product-management`). Su rol pasa a ser exclusivamente el de **valor semilla para la primera oferta de un producto nuevo** — el copy del formulario admin se actualiza para dejar esto explícito ("precio de referencia inicial — el precio público real se administra por categoría en 'Disponibilidad en el catálogo'").
3. **Todas las lecturas públicas se actualizan**: catálogo, ficha de oferta, resumen del cotizador, plantillas de correo (HTML y texto), copy de WhatsApp, y el schema `Offer` de SEO leen exclusivamente `ProductOffering.priceFromClp` desde el momento en que existen ofertas — ninguno vuelve a leer `Product.priceFromClp` para mostrarlo públicamente.
4. **Todas las escrituras se actualizan**: crear/editar una oferta escribe únicamente su propio `ProductOffering.priceFromClp`; no existe una sincronización automática continua entre `Product.priceFromClp` y las ofertas ya creadas — after the initial seed, they intentionally diverge, porque el precio de "lente óptico" legítimamente difiere del precio de "solo armazón" para el mismo producto.
5. **Eliminación del campo antiguo — en una migración POSTERIOR, no en esta**: una vez que (a) todo producto visible tiene al menos una `ProductOffering`, y (b) una búsqueda en el código confirma cero referencias restantes a `Product.priceFromClp` fuera del seed histórico, un cambio de limpieza posterior puede volver la columna nullable y luego eliminarla. Este cambio (`redesign-extensible-catalog-v2`) **no la elimina** — evita mantener dos fuentes de verdad *indefinidamente* al dejar un criterio de salida concreto y verificable, en vez de dejarlo abierto sin plan.

**Trazabilidad de tareas (corrige el secuenciamiento originalmente ambiguo de la tarea 3.3 de `tasks.md`)** — cada punto de esta fase de compatibilidad se implementa en una tarea concreta, no todas a la vez en la Fase 3:

| Punto de esta sección | Tarea(s) de `tasks.md` |
|---|---|
| 1. Backfill (una `ProductOffering` Lentes ópticos por producto visible sin ofertas previas, copiando `priceFromClp`) | **15.8** (agregada en el cierre de la Fase 15 — tasks.md nunca la capturó como tarea explícita; ver más abajo). El remapeo de ofertas ya existentes bajo la extinta `armazones` es un mecanismo distinto, ya implementado en la Fase 5 y validado de nuevo en **15.1** |
| 2. `Product.priceFromClp` permanece intacto como campo semilla/compatibilidad | Ya vigente desde la Fase 1 (1.1); el copy del formulario admin se actualiza en **4.2** |
| 3. Lecturas públicas — catálogo/ficha | **5.1**, **5.2** |
| 3. Lecturas públicas — cotizador (snapshot de precio) | **7.4** (resolución server-side), **8.1** (snapshot en `Request.details`) |
| 3. Lecturas públicas — correos | **8.2** |
| 3. Lecturas públicas — WhatsApp | **8.3** |
| 3. Lecturas públicas — schema SEO `Offer` | **9.2** |
| 4. Escrituras — `ProductOffering.priceFromClp` es la única fuente de precio dentro del dominio `ProductOffering`; el repositorio/servicio de `ProductOffering` nunca escribe ni sincroniza `Product.priceFromClp` | **3.3** (capa de dominio, ya implementada — `modules/catalog/offering-service.ts`) |
| 5. Verificación final de que ningún código público referencia `Product.priceFromClp` | **10.7** |

La Fase 3 (incluida 3.3) implementa **únicamente** la garantía de dominio del punto 4 — que `ProductOffering.priceFromClp` es autosuficiente y nunca sincroniza con `Product.priceFromClp` en ninguna dirección. Migrar los consumidores públicos (punto 3) y ejecutar el backfill (punto 1) son responsabilidad de las fases citadas arriba, no de la Fase 3. Aplicar el punto 3 antes de que el punto 1 haya corrido dejaría el catálogo en desarrollo mostrando "Cotizar" para los productos ya existentes — no es un `fallback` en código (no hay lectura condicional ni bandera que alterne entre `Product`/`ProductOffering`), es simplemente que ese corte de lectura pública no debe desplegarse (ni siquiera en el entorno de desarrollo local) antes de que su fase correspondiente lo acompañe del backfill que la precede en la secuencia de fases.

### Fase 15 — migración, backfill y corte definitivo — **CLOSED**

**15.1–15.7, tal como fueron redactadas originalmente, son 7 tareas de validación final — no de implementación nueva.** Ninguna pide eliminar/anular `Product.priceFromClp`, ninguna pide una migración Prisma, ninguna pide un backfill nuevo por su propio texto literal. El remapeo de taxonomía que 15.1 valida (`modules/catalog/taxonomy-migration.ts#migrateToDefinitiveTaxonomy()`) ya estaba completamente implementado desde la Fase 5, y ya se invoca automáticamente en cada corrida de `seedCategories()` — 15.1 solo repite esa validación contra una copia descartable de los datos, corriéndola dos veces para confirmar idempotencia (nunca contra el volumen principal).

**Gap real encontrado y corregido en la revisión previa de esta fase — tarea 15.8, nueva**: esta tabla de trazabilidad (punto 1, arriba) siempre asignó el backfill real — "una `ProductOffering` Lentes ópticos por cada `Product` visible sin ofertas previas, copiando `priceFromClp`" — a esta fase, pero **ninguna tarea de `tasks.md` lo capturaba explícitamente**; 15.1 solo cubre el remapeo de taxonomía (que nunca crea ofertas, solo remapea/renombra filas ya existentes bajo `armazones`/`lentes-de-sol-opticos`). Auditoría de datos reales al inicio de esta pasada: **7 de 11 `Product` visibles no tenían ninguna `ProductOffering`** — invisibles en el catálogo público V2 (que lista exclusivamente por `ProductOffering`), aunque accesibles vía `/admin/products`. No era un riesgo hipotético: era el estado real de la base de desarrollo. Se agregó 15.8 para implementar y ejecutar ese backfill, en vez de dejarlo como una discrepancia entre design.md y tasks.md sin resolver.

**Diseño del backfill (15.8)**: `modules/catalog/offering-backfill.ts` (planificación de solo lectura + escritura transaccional) + `scripts/backfill-product-offerings.ts` (CLI, `npm run catalog:backfill-product-offerings`) — mismo patrón de separación módulo/script ya establecido por `scripts/reconcile-quote-options.ts`. Nunca se invoca automáticamente (ni en el arranque, ni en requests públicos, ni en el seed normal, ni en una migración Prisma).

- **Candidatos**: `Product` con `visible: true` y sin ninguna `ProductOffering` — nunca un producto que ya tiene oferta en cualquier categoría, nunca se completa una segunda categoría automáticamente.
- **Destino único, nunca inferido**: `lentes-opticos` — el modelo no tiene ninguna señal (nombre, imagen, precio, keywords, atributos) que permita inferir con certeza que un `Product` V1 puro corresponde a "Lentes de sol"; inventar esa inferencia sería una fuente de error silencioso.
- **Datos copiados**: `productId`, `categoryId` (`lentes-opticos`), `slug` = `product.slug` exacto (nunca re-slugificado — preserva cualquier URL legada ya publicada bajo ese slug), `priceFromClp` copiado de `Product.priceFromClp` (nunca `0` fabricado; un valor inválido se reporta como conflicto y bloquea la escritura, nunca se fuerza), `active`/`visible: true`, `sortOrder` determinista (siguiente disponible tras el máximo ya existente en la categoría), `configuration`/`seoTitle`/`seoDescription` sin definir (nunca inventados). Nunca copia `capabilities`, `configuration` de otra oferta, ni ningún campo administrativo.
- **Ofertas existentes**: intocables — el backfill nunca actualiza precio/categoría/slug/nombre/`active`/`visible`/`configuration` de una oferta ya creada, incluida la que tiene una divergencia legítima de precio respecto a su `Product` (comportamiento ya establecido desde la Fase 3, preservado exactamente).
- **Colisión de slug**: estructuralmente casi imposible con los datos reales (`Product.slug` es único globalmente, y `offering.slug` siempre deriva de `product.slug` en la creación real vía el admin) — pero se verifica explícitamente antes de escribir, dos veces (planificación y, de nuevo, dentro de la transacción de escritura), y aborta el lote completo si aparece.
- **Dry-run por defecto**: sin `--write`, el script nunca escribe — solo reporta candidatos, ofertas existentes preservadas, conflictos, precios y URLs que se crearían.
- **Modo escritura**: exige simultáneamente `--write` **y** `--confirm=BACKFILL_PRODUCT_OFFERINGS` (la sola bandera `--write` nunca es suficiente), `NODE_ENV` distinto de `production`, `DATABASE_URL` definida, y ausencia de conflictos bloqueantes — repite la planificación completa dentro de una única transacción Prisma antes de escribir (nunca `upsert`/`createMany`, un `create` por candidato, para poder abortar el lote entero ante cualquier conflicto inesperado sin dejar resultados parciales).
- **Auditoría**: cada oferta creada se registra como `offering.created` (mismo nombre de acción que la creación manual vía admin) con `metadata.source: 'backfill-product-offerings'`, atribuido al primer SUPERADMIN activo.

**Validado en tres pasos, nunca directamente contra la base local**: (1) copia descartable creada vía `pg_dump`/`psql` dentro del mismo Postgres de Docker Compose, remapeo de taxonomía corrido dos veces (no-op, ya migrada) para confirmar idempotencia, backfill corrido en dry-run y luego en escritura dos veces (la segunda, 0 ofertas creadas), copia eliminada; (2) dry-run contra la base local real, confirmando que el plan coincidía exactamente con lo esperado (7 candidatos); (3) escritura confirmada contra la base local real — **7 `ProductOffering` creadas, 11 totales, 0 `Product` visibles sin oferta**, exactamente el resultado esperado. Una URL legada como `/catalogo/aurora` (antes 404, porque ese producto no tenía ninguna oferta) ahora redirige 308 correctamente a `/catalogo/lentes-opticos/aurora`.

**Sin migración Prisma, sin eliminación de `Product.priceFromClp`**: sigue exactamente el plan del punto 5 de esta misma sección — la eliminación del campo queda para un cambio de limpieza *posterior*, una vez confirmados ambos criterios de salida ((a) todo producto visible tiene al menos una oferta — ya cierto tras 15.8; (b) cero referencias públicas a `Product.priceFromClp` — ya confirmado en 15.7). `redesign-extensible-catalog-v2` no la elimina.

### Administración

- **`/admin/categories`** (new): list/create/edit/reorder/activate-deactivate/edit-slug-description-SEO-capabilities-attributes. **SUPERADMIN-only** for all of these, per explicit instruction — this is the "no-code extensibility" lever and is gated more tightly than routine catalog work.
- **Deleting a category with offerings**: blocked, mirroring the already-shipped `removeProductColor` pattern (`{status:'blocked', offeringCount}` instead of a silent/forced delete) — "preferir desactivación" reuses an established UX/API shape from this same codebase rather than inventing a new one.
- **Product form** gains a "Disponibilidad en el catálogo" section: per active category, a toggle + price-from + commercial title/description + featured + sort + attribute values + SEO. **ADMIN-permitted** (not SUPERADMIN-only) — see "Autorización" below.
- Product creation flow becomes: (1) base model — name/code/brand/colors/photos, exactly as today — then (2) select categories to offer it in and configure each `ProductOffering` — making the physical-model vs. commercial-offer distinction visible in the UI, not just in the schema.

### Imágenes de categoría — **CLOSED (extiende `catalog-administration`)**

`Category.imagePath` already exists as a plain `String?` column and is already rendered on `/catalogo`'s category cards — but it has **no upload pipeline today**: `CategoryForm.tsx` exposes it as a bare text `<input>` an admin must type/paste a path into, unlike `Product` images which go through a full MinIO-backed pipeline (`processProductImage` → `buildStorageKey`/`uploadObject`/`buildPublicUrl`). This section closes that gap by reusing the exact same pattern, not inventing a new one:

- **Upload/replace/delete/preview** from `/admin/categories/[id]/edit`, mirroring the existing product-photo admin UX (upload → processed preview → replace or remove).
- **MIME validation**: reuse `modules/storage/schemas.ts#imageFileMetaSchema` (JPG/JPEG/PNG accepted today) — content verified via `sharp`, never trusting the declared `Content-Type`, same discipline already applied to product photos.
- **WebP output (new)**: `lib/image-processing.ts#processProductImage` today always re-encodes to JPEG regardless of input format — no WebP generation path exists anywhere in the codebase yet. This design adds an optional WebP-output variant of that processing function (`processCategoryImage`, or a shared `format` parameter) — a genuinely new processing capability, not a reuse of an existing one.
- **Storage**: public bucket (`OBJECT_STORAGE_BUCKET`), same as product photos — category images are not sensitive, no reason to use the private bucket. Storage key pattern: `categories/${categoryId}/cover-${random}.${extension}` (mirrors `products/${productId}/${slot}-${suffix}.${extension}`).
- **Size limit**: reuse `MAX_IMAGE_BYTES` (8 MiB pre-processing), same as product photos, unless a smaller limit is explicitly requested later (category images are typically simpler hero/cover art, not detailed product photography — no evidence yet that a different limit is needed).
- **Public fallback**: when `imagePath` is null, `/catalogo`'s category card already renders an empty gray placeholder box (existing behavior, unchanged) — no broken `<img>` tag.
- **Authorization**: SUPERADMIN-only, same as all other category-structure mutations (see "Autorización" below) — an image is part of category structure, not routine merchandising.
- **Audit**: folds into the existing `category.updated` action (no new action needed — an image change is a category-field change like any other).
- **`Category.imageStorageKey` (new column, added during implementation)**: `imagePath` alone is a public URL — safely deleting/replacing the underlying MinIO object requires the actual storage key, never re-derived by parsing the URL (same discipline `ProductImage.storageKey` already establishes). Additive, nullable migration; `imagePath` is unchanged in shape. `saveCategoryImage()`/`deleteCategoryImage()` (`modules/catalog/category-service.ts`) are the only writers of either field — the general category form (`categoryFormSchema`) no longer accepts `imagePath` as a client-supplied value at all.
- **Admin UI gating**: `CategoryImageManager.tsx` only renders once a category exists (`categoryId` present) — identical constraint already established for `CategoryAttributesManager` ("guarda la categoría primero, luego configura"), not a new exception introduced for images.

### Autorización — **CLOSED**

Split final, sin ambigüedad, verificado siempre server-side (nunca solo ocultando UI en el cliente):

- **SUPERADMIN-only** (estructura): crear, editar, ordenar, activar/desactivar `Category`; editar `capabilities`; crear/editar/desactivar `CategoryAttributeDefinition` (estructura de filtros dinámicos). Esta es la palanca de "extensibilidad sin código" y se protege con `requireRole('SUPERADMIN')`.
- **ADMIN y SUPERADMIN** (mercadeo rutinario): crear y editar `ProductOffering` para productos existentes (activar/desactivar por categoría, precio, copy comercial, destacado, orden, valores de atributos ya definidos, SEO por oferta) — protegido con `requireSession()` (cualquier admin activo), el mismo nivel de confianza que ya tienen las mutaciones de color/imagen de producto hoy.
- Esta división resuelve la pregunta abierta previa ("¿ProductOffering requiere SUPERADMIN?"): **no**, cualquier ADMIN activo puede administrar ofertas; solo la estructura de categorías/capacidades/atributos requiere SUPERADMIN.

### Migración de datos: dos categorías — **CLOSED, reemplaza la migración originalmente aditiva-solamente**

**Esta migración ya no es puramente aditiva.** El diseño original (sembrar tres categorías nuevas + crear ofertas Armazones para productos visibles) asumía una base de datos sin categorías aún. Hoy, `redesign-extensible-catalog-v2` Fases 1–5 ya están implementadas y desplegadas contra el modelo de **tres** categorías (`armazones`, `lentes-opticos`, `lentes-de-sol-opticos` ya existen como filas `Category`, y ya pueden existir `ProductOffering`s de categoría `armazones`). La migración a dos categorías debe **remapear filas existentes**, no solo agregar filas nuevas:

1. **Renombrar `lentes-de-sol-opticos` → `lentes-de-sol`** in-place: `UPDATE categories SET slug = 'lentes-de-sol', name = 'Lentes de sol' WHERE slug = 'lentes-de-sol-opticos'` (o equivalente vía Prisma) — el `id` de la fila no cambia, así que todo `ProductOffering.categoryId` que ya apunte a ella sigue siendo válido sin tocar una sola oferta.
2. **Remapear la categoría `armazones`**: para cada `ProductOffering` con `categoryId = <id de armazones>`, decidir su destino:
   - Si ese mismo `Product` **no** tiene ya una oferta en `lentes-opticos`: reasignar la oferta existente (`UPDATE product_offerings SET categoryId = <id de lentes-opticos>`) — conserva `slug`, `priceFromClp`, `active`, `visible`, historial, y no rompe ninguna URL ya publicada bajo `/catalogo/armazones/[slug]` gracias a la capa de compatibilidad (paso 5).
   - Si ese mismo `Product` **ya** tiene una oferta en `lentes-opticos` (creada manualmente por un admin durante las Fases 1–5): la oferta `armazones` sobrante no se puede fusionar automáticamente sin perder datos potencialmente distintos (precio/copy) entre ambas — **requiere revisión manual admin por admin**, listada explícitamente en el reporte de migración (no hay un default seguro que no sea decisión humana aquí).
3. **Eliminar la categoría `armazones`** (fila `Category`) únicamente después de que el paso 2 confirme que ya no tiene ninguna `ProductOffering` asociada (mismo mecanismo ya implementado de "no se puede borrar una categoría con ofertas" — se usa aquí como verificación, no se bypasea).
4. **Capacidades**: al remapear una oferta de `armazones` hacia `lentes-opticos`, esa oferta hereda las capacidades de Lentes ópticos (cristal/tratamientos/receta habilitados) — un admin debe confirmar que el producto remapeado efectivamente admite esas opciones antes de que el cotizador lo ofrezca con ellas; esto se lista como un paso de revisión manual, no una asunción automática.
5. **Compatibilidad de URLs durante y después del remapeo**: cualquier URL ya publicada bajo `/catalogo/armazones/[offeringSlug]` deja de resolver directamente (la categoría `armazones` ya no existe) — debe tratarse como una URL "legada" más, resuelta por el mismo mecanismo de `/catalogo/[slug]` → oferta por defecto → redirect 308 (ver "Compatibilidad de URLs" arriba), nunca como un enlace roto.
6. Nothing about `Product`, `ProductColor`, `ProductImage`, `Brand`, `Request`, `RequestAttachment`, admin users, sessions, or audit entries is altered, duplicated, or deleted by this migration — same invariant as the original design.
7. Photos already in MinIO are untouched — `ProductOffering` never references storage directly, only `Product` does (unchanged).

**Riesgo nuevo, explícito**: a diferencia de la migración original (solo `INSERT`s, rollback trivial por revert de código), este remapeo incluye `UPDATE`s sobre `product_offerings.categoryId` y `categories.slug` — el rollback ya no es "el código revertido deja las tablas nuevas sin uso": requiere un script de reversión explícito que registre el mapeo aplicado (qué oferta se movió de qué categoría a cuál) antes de aplicar el cambio. Ver "Risks / Trade-offs" para este ítem como riesgo formal.

### SEO

- Each `ProductOffering` gets its own canonical URL and, when `seoTitle`/`seoDescription` are unset, falls back to a category-aware template (e.g. `"${product.name} — ${category.name} | Pepi Visión 360"`) rather than reusing the bare product name for every category — this is the deliberate anti-duplicate-content measure requested in §14: the same `Product` appearing under two categories must render two distinct `<title>`/meta description pairs, not identical ones.
- `BreadcrumbList` JSON-LD: Home → Catálogo → Category → Offering.
- `ItemList` JSON-LD on `/catalogo/[categorySlug]` for the visible offerings.
- `Product`/`Offer` JSON-LD on the offering detail page, `offers.price` populated only when `priceFromClp` is non-null (a null price never renders a fake `$0` offer schema).
- Sitemap: one entry per `active: true, visible: true` `Category`, one entry per `active: true, visible: true` `ProductOffering`, plus a permanent redirect entry (not a duplicate content entry) for legacy `/catalogo/[slug]` paths.

### Fase 14 — SEO y compatibilidad de rutas — **CLOSED**

El sketch anterior se implementó en un módulo centralizado nuevo, `modules/catalog/seo.ts` (puro, sin Prisma, sin React — mismo patrón que `dynamic-filters.ts`), consumido por `generateMetadata()` de ambas páginas del catálogo y por `app/sitemap.ts`. La URL pública base es `env.NEXT_PUBLIC_APP_URL` (única fuente ya validada del dominio público, la misma que `app/layout.tsx` usa para `metadataBase`) — nunca un `localhost` hardcodeado.

**Fallback de título/descripción**: `category.seoTitle`/`seoDescription` y `offering.seoTitle`/`seoDescription` (ya existentes en Prisma desde fases anteriores, editables desde el admin) llegan ahora a los mappers públicos (`CategoryPickerItem`, `OfferingDetailView`) y se usan como primera fuente; el fallback para la oferta es exactamente `"${offering.name} — ${category.name} | Pepi Visión 360"` (`offering.name` ya resuelto como `offering.title ?? product.name`, no el nombre crudo del producto) — un mismo `Product` en las dos categorías produce dos títulos distintos sin que el admin tenga que configurar nada, porque `category.name` difiere.

**URLs facetadas (decisión no cubierta explícitamente por ninguna de las 5 tareas, pero necesaria para 14.2)**: `generateMetadata` de `/catalogo/[categorySlug]` ahora recibe `searchParams` — cualquier query param presente, sin importar cuál (filtros comunes, `attr_*`, `q`, `price`, `availableOnly`, orden, paginación, o uno desconocido), fuerza `robots: { index: false, follow: true }`; el `canonical` siempre apunta a la URL limpia (`/catalogo/[categorySlug]`, sin query string); el `ItemList` JSON-LD se reserva exclusivamente para la URL limpia (una variante filtrada solo emite `BreadcrumbList`, nunca un `ItemList` parcial que contradiga la página canónica). Esto es fail-closed por diseño: la detección es "¿hay algún query param?" (`Object.keys(searchParams).length > 0`), nunca una allowlist de nombres conocidos — un parámetro nuevo o no reconocido nunca queda indexable por omisión.

**`Offer` sin precio (14.5)**: cuando `ProductOffering.priceFromClp` es `null`, `toOfferingProductJsonLd()` omite el nodo `offers` completo (no solo `price`) — un `Offer` sin `price`/`priceCurrency` válidos no aporta valor estructurado real y arriesga un schema inconsistente; el `Product` en sí (nombre, descripción, marca, imágenes, categoría, URL) sigue emitiéndose siempre. Nunca se emite `availability`: ni `active` ni `visible` son una señal real de inventario, y ninguna spec autoriza esa equivalencia.

**Serialización JSON-LD**: `serializeJsonLd()` aplica `JSON.stringify` + escape de `<`/`>`/`&` a sus secuencias Unicode (`<` etc.) antes de inyectar el resultado vía `dangerouslySetInnerHTML` en `<script type="application/ld+json">` — el único uso legítimo de `dangerouslySetInnerHTML` en este módulo, porque el contenido ya pasó por una serialización segura; nunca se concatena JSON manualmente ni se acepta contenido crudo de query params.

**Sitemap**: `app/sitemap.ts` nuevo, usando `MetadataRoute.Sitemap`. Una entrada por `Category` activa/visible (reutilizando `getCategoryPicker()`) y una por `ProductOffering` pública (`getPublicOfferingsForSitemap()`, repositorio nuevo `listAllPublicOfferingsForSitemap()` con el mismo triple filtro `active/visible/deletedAt` + `category.active/visible` + `product.visible` que toda otra lectura pública) — nunca slugs legados, nunca rutas admin/API, nunca URLs con query params. `lastModified` usa el `updatedAt` real de cada fila, nunca `new Date()` en cada request.

**`app/robots.ts` — decisión explícita de NO crearlo en esta fase**: no aparece en ninguna de las tareas 14.1–14.5 ni en `specs/catalog-seo/spec.md`; `/admin/*` ya tiene `metadata.robots: {index:false}` página por página (suficiente para evitar la indexación, aunque no impide el rastreo — un `robots.ts` que además bloqueara el rastreo de `/admin` sería una ampliación de alcance no solicitada); las variantes facetadas del catálogo se resuelven con `robots` dinámico en `generateMetadata`, no con una regla estática de `Disallow`. Se documenta aquí para que una fase futura (o el cambio que finalmente decida agregar `robots.ts`) no lo reintroduzca sin revisar esta nota.

**Gap real corregido en la revisión previa de esta fase**: `seoTitle`/`seoDescription` de `Category`/`ProductOffering` existían en Prisma y eran editables desde el admin desde fases anteriores, pero ningún mapper público (`CategoryPickerItem`, `OfferingDetailView`) los exponía — el catálogo público los ignoraba por completo. Corregido extendiendo ambos view models (ver 14.1).

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

### Fase 5 — evaluación contra la nueva taxonomía — **CLOSED**

Fase 5 (catálogo público) fue implementada y **ya está commiteada** en `main` (`42f3f35 feat: add category-based public catalog`, y su corrección de CTA/labels en el mismo commit) contra el modelo de tres categorías. Esta sección clasifica cada tarea 5.1–5.7 contra la nueva taxonomía de dos categorías — ninguna implica revertir el commit; donde algo debe cambiar, se convierte en una tarea explícita de la Fase 5-bis (ver tasks.md).

| Tarea | Clasificación | Razón |
|---|---|---|
| 5.1 (reconstruir `modules/catalog/*` sobre `ProductOffering`, precio exclusivo de `ProductOffering.priceFromClp`) | **Sigue válida** | La arquitectura offering-first es agnóstica a cuántas categorías existan — `buildPublicOfferingWhere`, `listPublicOfferingsForCategoryFiltered`, etc. operan sobre cualquier `categoryId`, sin hardcodear `armazones`. Ningún cambio de código necesario aquí. |
| 5.2 (rutas `/catalogo`, `/catalogo/[categorySlug]`, `/catalogo/[categorySlug]/[offeringSlug]`) | **Sigue válida (rutas); copy debe actualizarse** | La estructura de rutas es agnóstica al conteo de categorías. El copy hardcodeado que menciona las tres categorías (p. ej. la descripción de metadata de `/catalogo`: "armazones, lentes ópticos y lentes de sol ópticos") debe actualizarse — tarea nueva en Fase 5-bis, no una reapertura de la ruta en sí. |
| 5.3 (capa de compatibilidad: `/catalogo/[slug]` → oferta por defecto → redirect 308) | **Debe reabrirse** | `findDefaultPublicOfferingForProductSlug` hardcodea `offerings.find(o => o.category.slug === 'armazones') ?? offerings[0]` — esa categoría deja de existir. Ver "Compatibilidad de URLs" arriba para el nuevo default (`lentes-opticos`). |
| 5.4 (CTA por categoría: "Ver armazón" / "Configurar lentes" / "Configurar lentes de sol ópticos") | **Debe reemplazarse** | `CATEGORY_CTA_LABELS` está hardcodeado a los tres slugs antiguos. Ver el mapa de dos entradas en "Rediseño del catálogo público" arriba. |
| 5.5 ("También disponible como" cross-category links) | **Sigue completamente válida** | El mecanismo (`listOtherPublicOfferingsForProduct`, indexado por `productId`) es agnóstico al número de categorías — con dos categorías simplemente muestra menos enlaces cruzados posibles (como máximo uno), sin cambio de código. |
| 5.6 (prueba: redirect legado + 404 para producto sin oferta) | **Escenario válido; implementación de la prueba requiere actualización** | El comportamiento a probar (redirect funciona, 404 se preserva) sigue siendo el requerimiento correcto. Los *fixtures* E2E actuales (`e2e/global-setup.ts`, `e2e/public/catalog.spec.ts`) siembran/afirman contra la categoría `armazones` y el CTA "Ver armazón" — deben actualizarse a la nueva taxonomía cuando la Fase 5-bis se implemente. No se modifican tests en este turno documental. |
| 5.7 (prueba: navegación responsive + estado vacío por categoría) | **Sigue completamente válida** | Agnóstica al número/nombre de categorías; seguirá pasando una vez que los fixtures reflejen las dos categorías definitivas. |

**Regla aplicada**: ningún checkbox de 5.3/5.4 permanece marcado como completo sin condición — tasks.md los reabre explícitamente (ver Fase 5-bis) en vez de dejarlos con un `[x]` que ya no refleja la realidad, por instrucción directa de no marcar como válido automáticamente un trabajo que debe evaluarse contra los nuevos requerimientos.

### Fase 11 — snapshot histórico definitivo de solicitudes — **CLOSED**

`Request.details` seguía siendo, hasta el cierre de la Fase 10, un objeto plano construido inline dentro de `submitQuote` — correcto en contenido (todos los campos de `request-category-snapshot` ya se escribían) pero sin ningún contrato formal: ningún discriminador de versión, ninguna validación de la forma completa antes de persistir, y ningún lector único para los consumidores (`RequestCard.tsx` seguía leyendo `details` con casts crudos, y ninguna plantilla de correo mostraba categoría todavía). La Fase 11 cierra exactamente esa brecha, sin tocar el modelo Prisma:

- **`Request.details` permanece `Json?` — sin migración.** El contrato versionado vive enteramente dentro del JSON (`detailsVersion: 2` como discriminador explícito, nunca inferido de la sola presencia de un campo), porque el problema real era la falta de estructura/validación, no un tipo de columna insuficiente.
- **Un único constructor, `buildRequestSnapshotV2()`** (`modules/requests/request-snapshot.ts`), recibe exclusivamente los valores que `submitQuote` ya resolvió/validó server-side (sin cambios en esa resolución — Fases 9–10 ya la implementaban) y valida la forma completa con un schema Zod `.strict()` antes de devolver el snapshot; si no calza, lanza `ValidationError` **antes** de tocar Postgres, nunca persiste una fila con forma inválida.
- **Un único lector normalizado, `parseRequestDetails()`**, discrimina V1 (sin `detailsVersion`) de V2 (`detailsVersion === 2`) y devuelve siempre la misma forma (`NormalizedRequestDetails`) — ni `RequestCard.tsx` ni las plantillas de correo necesitan saber en qué versión está una fila. Fail-safe explícito: un `detailsVersion` presente pero distinto de `2` (un formato futuro/desconocido) se trata como `'unknown'`, **nunca** se interpreta silenciosamente como V1 — la única forma de terminar en la rama V1 es la ausencia total del campo. JSON corrupto/no-objeto also produce `'unknown'`, nunca lanza (evita que una fila mala derribe un listado completo).
- **Cero backfill, cero UPDATE histórico.** Las filas V1 (anteriores a esta fase, o del período intermedio de la Fase 10 que ya tenía `categoryId`/`categoryName` pero no `detailsVersion`) se leen tal cual, para siempre — `parseRequestDetails()` incluso lee oportunistamente `categoryName`/`categorySlug` de esas filas intermedias si están presentes, sin exigirlas. "Multifocal" histórico nunca se traduce a "Progresivo".
- **Consumidores adaptados, sin rediseño visual**: `RequestCard.tsx` gana una fila "Categoría" (solo cuando el snapshot la tiene); `quote-customer-confirmation.ts`/`quote-business-notification.ts` ganan un campo `categoryName` (obligatorio, ya resuelto por `submitQuote`) y una fila "Categoría" en HTML y texto — ninguna plantilla necesita ramificar V1 vs. V2 porque los correos solo se generan para la solicitud que se está creando en ese momento (nunca se re-renderiza un correo antiguo; `EmailLog` no guarda el HTML/texto enviado, solo su estado).
- **Filtro de categoría en el inbox administrativo** (11.2): `requestFilterSchema` gana `category`, restringido a una allowlist cerrada de las dos categorías reales (`REQUEST_CATEGORY_FILTER_SLUGS`) — nunca un slug arbitrario del query param. `admin-repository.ts` filtra vía el operador JSON nativo de Prisma (`{ path: ['categorySlug'], equals }`), sin reconstruir nada desde una fila V1 (que simplemente no calza con ningún valor de la allowlist y queda fuera del filtro, correcto por diseño).

**GUI acceptance gate**: 11.1/11.2 sí modifican salida visible (fila "Categoría" en el panel admin, chips de filtro, fila "Categoría" en ambos correos) — el gate completo aplica, no se documentó como "no aplica". Revisión propia ya realizada en desktop/tablet/mobile + zoom 200% contra datos reales del entorno de desarrollo (incluyendo una fila V1 genuina sin categoría y una fila intermedia de la Fase 10 con categoría pero sin `detailsVersion`, ambas renderizando correctamente) y verificación del correo en Mailpit real (HTML y texto). Tarea 11.5 registrada y dejada `[ ]` — pendiente de aprobación explícita del propietario, igual que 10.10.

**Hallazgo de la revisión, sin acción requerida**: el panel `/admin/requests`, al igual que `/cotizador` en la Fase 10, muestra el header público duplicado en capturas `fullPage` de Playwright cuando el contenido es suficientemente largo — mismo artefacto de stitching sobre un elemento `sticky` ya diagnosticado en la Fase 10 (`Header.tsx` envuelve todo el árbol de rutas, incluido `/admin`), no un defecto de esta fase ni del layout administrativo.

### Fase 11 — corrección final de presentación: "no aplica" vs. "aplica pero no disponible" — **CLOSED**

La revisión visual detectó que una solicitud V2 con una modalidad que no requiere receta (Sin graduación) mostraba "Receta óptica: —" en los tres consumidores — contradice la regla ya establecida de ocultar campos no aplicables (distinta de un dato realmente ausente). La causa: `submitQuote` ya calculaba `prescriptionAnswer` como `null` exactamente cuando no aplica (`prescriptionStepActive` falso) y como una respuesta real cuando sí aplica — nunca ambiguo, porque `submitQuote` exige la respuesta cuando el paso está activo — pero los tres consumidores (RequestCard, ambas plantillas) o bien aplicaban `?? '—'` al pasar el valor, o bien renderizaban la fila incondicionalmente.

**Decisión**: en vez de introducir un campo nuevo del contrato (`prescriptionApplicable`, redundante — `prescriptionAnswer === null` ya lo significa para V2) o un helper compartido en `request-snapshot.ts` (innecesario — los correos ni siquiera pasan por `parseRequestDetails`, se generan a partir de las mismas variables en memoria que `submitQuote` ya validó), cada consumidor decide localmente con la semántica ya disponible: los correos omiten la fila cuando `prescriptionAnswer === null` (ya no `?? '—'`); `RequestCard.tsx` omite la fila solo para V2 con `prescriptionAnswer === null`, preservando el comportamiento histórico exacto de V1 (siempre visible, con "—" si falta — nunca se reinterpreta un dato V1 ausente como "no aplica", porque no hay forma de saberlo con certeza para una fila legada).

**Brecha de cobertura encontrada y cerrada durante esta misma corrección**: el primer intento de fix (`replace_all` sobre `service.ts`) solo alcanzó el call site de `quoteCustomerConfirmation`; el de `quoteBusinessNotification` conservó `prescriptionAnswer ?? '—'` intacto. La prueba de integración agregada en el cierre anterior solo verificaba el correo de confirmación al cliente (`findMailpitMessagesTo(email)`, la dirección del cliente) — nunca el de notificación al negocio, enviado a una dirección distinta. La revisión visual manual en Mailpit real detectó la fila "Receta óptica: —" todavía presente en el correo de negocio, exactamente el escenario para el que existe el paso de revisión visual manual (CLAUDE.md, regla 2: "los tests automatizados no son suficientes"). Corregido, y la prueba de integración ahora verifica ambos correos por separado.

## Risks / Trade-offs

- **[Risk]** Two large in-flight OpenSpec changes could drift or conflict if implemented out of order. → **[Mitigation, CLOSED]** Firm sequencing decision (see "Secuencia con `add-pepi-vision-360-v1`"): this change is implemented only after `add-pepi-vision-360-v1` is completed and archived, never interleaved or auto-modified/auto-archived by this proposal.
- **[Risk]** `ProductOffering.configuration` could silently become a dumping ground for data that should have been a proper attribute or column. → **[Mitigation]** Versioned Zod schema with a small, explicit allowed shape (see "`ProductOffering.configuration`"); anything filterable/displayable belongs in `CategoryAttributeDefinition` instead, and the design doc lists concrete invalid examples precisely to make this reviewable in code review.
- **[Risk]** Keeping `Product.priceFromClp` and `ProductOffering.priceFromClp` side by side for a compatibility period could drift into two permanent, inconsistent sources of truth. → **[Mitigation, CLOSED]** Explicit exit criterion defined (see "Fase de compatibilidad de precios"): the legacy field is removed in a later, separate migration once every visible product has an offering and zero code references remain — not left open-ended.
- **[Risk]** Category-scoped offering slugs mean the same slug string legitimately resolves to different content depending on the category segment. → **[Mitigation]** Canonical URLs are always the full 3-segment path; nothing in the design treats an offering slug as unique on its own.
- **[Risk]** JSON `capabilities`/`options` columns can't be filtered on efficiently at the DB level. → **[Mitigation]** They're never queried inside SQL — read wholesale per category (small, infrequently-changing) and validated via Zod at the boundary. Anything that genuinely needs SQL-level filtering (attribute values) is deliberately modeled as typed columns instead, not JSON.
- **[Risk]** Admins could create confusingly similar category names/slugs over time. → **[Mitigation]** Reuses the exact slugify + unique-index + "prefer deactivation" pattern already proven for `Brand`.
- **[Risk]** Wrapping the prescription-attachment step inside a capability gate could regress its security model if reimplemented carelessly. → **[Mitigation]** The design calls for reusing `modules/storage/private-service.ts`/`RequestAttachment`/signed-URL admin access completely unchanged — zero new file-handling code, only a new gate on whether the step is shown/persisted.
- **[Risk]** An extra `Product → ProductOffering → Category` join on every public catalog query. → **[Mitigation]** Indexed, category-first-filtered, and structurally identical to the already-shipped `Product → Brand` join with no observed performance issue.
- **[Risk]** Scope size — public catalog, quote wizard, admin product form, and emails all change. → **[Mitigation]** tasks.md is phased into independently reviewable blocks, so no single PR needs to land the whole redesign at once.
- **[Risk, NEW]** The two-category migration is no longer purely additive — it remaps existing `armazones` offerings into `lentes-opticos` and renames the `lentes-de-sol-opticos` slug, on top of Phases 1–5 already being implemented and committed. → **[Mitigation]** See "Migración de datos: dos categorías" — the remap is idempotent per offering, requires explicit admin review only for the rare case of a product already offered in both `armazones` and `lentes-opticos`, and ships with an explicit reversal mapping rather than relying on "just revert the code" (which no longer suffices once rows are updated in place).
- **[Risk, NEW]** Renaming the `glassType` enum value `Multifocal` → `Progresivo` changes a value already persisted in historical `Request.details` JSON. → **[Mitigation]** Historical rows are immutable snapshots (same principle as `request-category-snapshot`) and are never rewritten; only new submissions use the new value. Every current occurrence of "Multifocal" was enumerated this turn (see "Contenido de cristales, tratamientos y opciones adicionales") so the future implementation has a complete checklist instead of discovering occurrences ad hoc.
- **[Risk, NEW]** Phase 5's already-committed code encodes three-category assumptions in two specific places (`offering-repository.ts`'s legacy-redirect default, `labels.ts`'s CTA map) that will silently produce wrong behavior (arbitrary redirect target, missing/fallback CTA label) if the taxonomy migration lands without updating them. → **[Mitigation]** Both call sites and their exact current code are documented above ("Compatibilidad de URLs", "Rediseño del catálogo público") and are explicit tasks in Fase 5-bis, not left implicit.

## Migration Plan

**Nota (post-replanificación de taxonomía)**: los pasos 0–1 ya ocurrieron (Fases 1–5 están implementadas y commiteadas). El paso 2 original (seed puramente aditivo de tres categorías) queda **superseded** por "Migración de datos: dos categorías" arriba, que además remapea filas ya existentes — leer ese apartado como la versión vigente del paso 2, no este resumen histórico.

0. **Precondition (CLOSED — see "Secuencia con `add-pepi-vision-360-v1`"): `add-pepi-vision-360-v1` is completed and archived before step 1 begins.** ✅ ya ocurrió.
1. Apply the new-tables-only Prisma migration (`Category`, `ProductOffering`, `CategoryAttributeDefinition`, `ProductOfferingAttributeValue`, `CategoryAttributeType` enum) — purely additive, no existing table altered. `Product.priceFromClp` is untouched (still `NOT NULL`, unchanged validation) per the price-compatibility decision. ✅ ya ocurrió (Fase 1).
2. ~~Run the idempotent category seed... then the idempotent Armazones-offering seed...~~ **Superseded** — ver "Migración de datos: dos categorías": renombrar `lentes-de-sol-opticos` → `lentes-de-sol` in-place, remapear ofertas `armazones` → `lentes-opticos`, eliminar la categoría `armazones` vacía, y solo entonces sembrar/backfillear lo que falte para productos sin ninguna oferta previa.
3. Ship the offering-aware catalog/cotizador/admin code with `/catalogo/[slug]` (and, per this replanning, `/catalogo/armazones/[offeringSlug]` as an additional legacy pattern) as a redirect layer. All public price reads switch to `ProductOffering.priceFromClp` at this point (see "Fase de compatibilidad de precios").
4. Manually verify every previously-published product URL still resolves (now via redirect) before considering any old code path removable — part of tasks.md's final validation phase.
5. **Rollback**: since step 1 only adds tables and steps 2–3 only add rows/redirect logic (nothing existing is altered or dropped), rolling back is a plain code revert; the additive tables can remain unused harmlessly, or be dropped via a follow-up down migration if ever desired. No data-loss risk to `Product`/`Request`/`Brand`/existing images.
6. **Follow-up, separate change (not part of this migration)**: once every visible product has at least one `ProductOffering` and no code references `Product.priceFromClp` outside the historical seed, a later cleanup change makes the column nullable and then removes it.

## Dependencias con otros cambios OpenSpec

Cinco cambios independientes, puramente documentales en esta pasada, se crearon junto con esta replanificación porque tocan áreas que Graphify identificó como relacionadas pero que no dependen estructuralmente de la taxonomía de categorías:

- **`add-admin-brand-management`** — independiente de este cambio; se integra con `Product`/carrusel de inicio, no con `Category`/`ProductOffering`. Puede implementarse en cualquier momento.
- **`improve-transactional-emails`** — la parte de plantillas cliente/negocio y horario comercial es independiente; la parte que muestra contexto de categoría/oferta en el correo **debe** esperar a que este cambio (`redesign-extensible-catalog-v2`) publique el snapshot final de `request-category-snapshot` con la taxonomía de dos categorías ya correcta — de lo contrario se documentaría/probaría contra un snapshot que va a cambiar de forma.
- **`add-formal-admin-quotations`** — depende de `ProductOffering`/`Category` (Fases 1–3, ya implementadas) para sus líneas de detalle, pero explícitamente **no** debe depender de `Product.priceFromClp` como única fuente de precio (ver "Fase de compatibilidad de precios" arriba) — debe leer `ProductOffering.priceFromClp`, igual que el resto del catálogo público.
- **`improve-visual-identity-and-content`** — independiente del catálogo salvo por la iconografía de `/cristales` (que si esta pasada define contenido nuevo de tipos/tratamientos, esa página necesitará iconos para las nuevas entradas — dependencia de contenido, no de código).
- **`temporarily-disable-home-visit`** — completamente independiente de la taxonomía de categorías; prioritario porque afecta disponibilidad pública inmediata, no bloqueado por nada de este cambio.

**Orden recomendado de ejecución** (detallado con el mismo criterio en cada cambio nuevo, ver sus propios `design.md`):
1. `temporarily-disable-home-visit` (independiente, rápido, afecta disponibilidad pública ya).
2. Corrección de taxonomía de `redesign-extensible-catalog-v2` (Fase 5-bis) — bloquea el resto de este cambio.
3. `add-admin-brand-management` (independiente, puede ir en paralelo a 2).
4. Resto de `redesign-extensible-catalog-v2` (imágenes de categoría, contenido de cristales, motor de compatibilidades, cotizador condicional, snapshot, filtros dinámicos, SEO, migración/backfill, cierre).
5. `improve-transactional-emails` (la parte de contexto de categoría/oferta espera al punto 4; el resto puede ir en paralelo desde ahora).
6. `add-formal-admin-quotations` (depende de que el modelo de `ProductOffering`/precio esté estable, ya lo está desde la Fase 3 — puede empezar en paralelo a 4).
7. `improve-visual-identity-and-content` (puede ir en cualquier momento; conviene alinear su paso de iconografía de `/cristales` con el punto 4).

## Open Questions

Cuestiones genuinamente abiertas (todas las demás del borrador previo — split SUPERADMIN/ADMIN, forma de `configuration`, ruta de baja de `Product.priceFromClp`, secuenciamiento con `add-pepi-vision-360-v1` — son decisiones cerradas ya documentadas arriba):

- Exact copy for the new "¿Qué deseas cotizar?" first wizard step needs a business/marketing pass before implementation.
- Should the legacy `/catalogo/[slug]` redirect be silent (308) or show a brief "este modelo ahora vive en..." interstitial? (This design assumes a silent permanent redirect.)
- **(NUEVA)** ¿Puede un cliente cotizar únicamente el armazón sin cristales ópticos dentro de la categoría Lentes ópticos (equivalente al antiguo flujo "Armazones"), o el tipo de cristal es un paso obligatorio una vez elegida esa categoría? Ver "Contenido de cristales, tratamientos y opciones adicionales" — determina si `allowsLensType`/`allowsTreatments`/`allowsPrescription` deben poder omitirse dentro de Lentes ópticos.
- **(NUEVA)** Para un producto ya ofertado tanto en `armazones` como en `lentes-opticos` antes de este remapeo (caso raro, creado manualmente por un admin durante las Fases 1–5) — ¿cuál oferta prevalece y cuál se desactiva? Ver "Migración de datos: dos categorías", paso 2 — este cambio documenta el caso pero no fija el criterio de desempate, que requiere revisión admin caso por caso.
