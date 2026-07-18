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

1. **Durante la migración**: cada producto `visible: true` sin ofertas previas genera su `ProductOffering` de categoría Lentes ópticos usando `Product.priceFromClp` como valor inicial de `priceFromClp`; un producto que ya tenía una oferta bajo la extinta categoría `armazones` la conserva remapeada, no duplicada (ver "Migración de datos: dos categorías").
2. **Durante la fase de compatibilidad**: `Product.priceFromClp` permanece como columna `NOT NULL` sin cambios — el formulario admin de producto lo sigue exigiendo al crear/editar el modelo base (evita una migración disruptiva de datos existentes y de la validación ya probada de `product-management`). Su rol pasa a ser exclusivamente el de **valor semilla para la primera oferta de un producto nuevo** — el copy del formulario admin se actualiza para dejar esto explícito ("precio de referencia inicial — el precio público real se administra por categoría en 'Disponibilidad en el catálogo'").
3. **Todas las lecturas públicas se actualizan**: catálogo, ficha de oferta, resumen del cotizador, plantillas de correo (HTML y texto), copy de WhatsApp, y el schema `Offer` de SEO leen exclusivamente `ProductOffering.priceFromClp` desde el momento en que existen ofertas — ninguno vuelve a leer `Product.priceFromClp` para mostrarlo públicamente.
4. **Todas las escrituras se actualizan**: crear/editar una oferta escribe únicamente su propio `ProductOffering.priceFromClp`; no existe una sincronización automática continua entre `Product.priceFromClp` y las ofertas ya creadas — after the initial seed, they intentionally diverge, porque el precio de "lente óptico" legítimamente difiere del precio de "solo armazón" para el mismo producto.
5. **Eliminación del campo antiguo — en una migración POSTERIOR, no en esta**: una vez que (a) todo producto visible tiene al menos una `ProductOffering`, y (b) una búsqueda en el código confirma cero referencias restantes a `Product.priceFromClp` fuera del seed histórico, un cambio de limpieza posterior puede volver la columna nullable y luego eliminarla. Este cambio (`redesign-extensible-catalog-v2`) **no la elimina** — evita mantener dos fuentes de verdad *indefinidamente* al dejar un criterio de salida concreto y verificable, en vez de dejarlo abierto sin plan.

**Trazabilidad de tareas (corrige el secuenciamiento originalmente ambiguo de la tarea 3.3 de `tasks.md`)** — cada punto de esta fase de compatibilidad se implementa en una tarea concreta, no todas a la vez en la Fase 3:

| Punto de esta sección | Tarea(s) de `tasks.md` |
|---|---|
| 1. Backfill (una `ProductOffering` Lentes ópticos por producto visible sin ofertas previas, copiando `priceFromClp`; remapeo de ofertas ya existentes bajo la extinta `armazones`) | **15.1** (ver Fase 5 para el remapeo y Fase 15 para el backfill/validación final) |
| 2. `Product.priceFromClp` permanece intacto como campo semilla/compatibilidad | Ya vigente desde la Fase 1 (1.1); el copy del formulario admin se actualiza en **4.2** |
| 3. Lecturas públicas — catálogo/ficha | **5.1**, **5.2** |
| 3. Lecturas públicas — cotizador (snapshot de precio) | **7.4** (resolución server-side), **8.1** (snapshot en `Request.details`) |
| 3. Lecturas públicas — correos | **8.2** |
| 3. Lecturas públicas — WhatsApp | **8.3** |
| 3. Lecturas públicas — schema SEO `Offer` | **9.2** |
| 4. Escrituras — `ProductOffering.priceFromClp` es la única fuente de precio dentro del dominio `ProductOffering`; el repositorio/servicio de `ProductOffering` nunca escribe ni sincroniza `Product.priceFromClp` | **3.3** (capa de dominio, ya implementada — `modules/catalog/offering-service.ts`) |
| 5. Verificación final de que ningún código público referencia `Product.priceFromClp` | **10.7** |

La Fase 3 (incluida 3.3) implementa **únicamente** la garantía de dominio del punto 4 — que `ProductOffering.priceFromClp` es autosuficiente y nunca sincroniza con `Product.priceFromClp` en ninguna dirección. Migrar los consumidores públicos (punto 3) y ejecutar el backfill (punto 1) son responsabilidad de las fases citadas arriba, no de la Fase 3. Aplicar el punto 3 antes de que el punto 1 haya corrido dejaría el catálogo en desarrollo mostrando "Cotizar" para los productos ya existentes — no es un `fallback` en código (no hay lectura condicional ni bandera que alterne entre `Product`/`ProductOffering`), es simplemente que ese corte de lectura pública no debe desplegarse (ni siquiera en el entorno de desarrollo local) antes de que su fase correspondiente lo acompañe del backfill que la precede en la secuencia de fases.

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
