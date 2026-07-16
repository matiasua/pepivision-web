Numeración reestructurada tras la corrección de taxonomía (dos categorías definitivas: Lentes ópticos, Lentes de sol — ver design.md → "Taxonomía definitiva de categorías" y "Fase 5 — evaluación contra la nueva taxonomía"). La numeración original (Fases 1–10) no se conserva donde generaba una secuencia incorrecta, pero cada tarea previamente completada permanece trazable — ver la "Tabla de trazabilidad" al final de este documento. Ningún checkbox marcado en las Fases 1–4 se oculta; las partes de la Fase 5 que ya no satisfacen la nueva taxonomía quedan explícitamente reabiertas, no ocultas.

## 0. Precondición de secuencia (bloqueante, no iniciar el resto sin esto)

- [x] 0.1 Confirmar que `add-pepi-vision-360-v1` está completado y archivado (`openspec/specs/` contiene sus capacidades). No iniciar la Fase 1 antes de esto — ver design.md → "Secuencia con `add-pepi-vision-360-v1`".

## 1. Modelo de datos — ya completado, sin cambios

- [x] 1.1 Agregar `Category`, `ProductOffering`, `CategoryAttributeDefinition`, `ProductOfferingAttributeValue` y el enum `CategoryAttributeType` a `prisma/schema.prisma`.
- [x] 1.2 Generar y aplicar la migración Prisma dentro de Docker Compose.
- [x] 1.3 Verificar que `Product`/`ProductColor`/`ProductImage`/`Brand`/`Request`/`RequestAttachment` quedan intactos.
- [x] 1.4 Implementar `categoryCapabilitiesSchema` (Zod), sin cambios de forma tras la corrección de taxonomía.
- [x] 1.5 Implementar `offeringConfigurationSchema` (Zod, versionado).

## 2. Categorías y seed — ya completados parcialmente, valores de seed reabiertos en Fase 5

- [x] 2.1 Implementar repositorio/servicio de `Category` (CRUD, validación de capabilities, slugify + unicidad). Sigue válido — agnóstico al número de categorías.
- [ ] 2.2 ~~Extender `prisma/seed.ts` con un seed idempotente de las tres categorías iniciales~~ **REABIERTA**: el seed debe declarar exactamente las dos categorías definitivas (Lentes ópticos, Lentes de sol) desde ahora en adelante. Ver 5.2 para el remapeo de las filas ya sembradas con tres categorías en instalaciones existentes.
- [x] 2.3 Prueba: correr el seed dos veces no duplica categorías. Sigue válida (comportamiento de idempotencia, agnóstico al conteo).
- [x] 2.4 Prueba: capabilities malformadas se rechazan al escribir / fail-closed al leer. Sigue válida, sin cambios.

## 3. ProductOfferings — ya completado, sin cambios

- [x] 3.1 Repositorio/servicio de `ProductOffering` (crear/actualizar/soft-delete), `@@unique([productId, categoryId])`, `@@unique([categoryId, slug])`.
- [x] 3.2 Helper de verificación de pertenencia oferta↔categoría↔producto.
- [x] 3.3 `ProductOffering.priceFromClp` como única fuente de precio dentro del dominio `ProductOffering` — ver design.md → "Fase de compatibilidad de precios".
- [x] 3.4 Prueba: un mismo `Product` en dos categorías no duplica `ProductColor` ni `ProductImage`.
- [x] 3.5 Prueba: precios distintos por categoría para el mismo `Product`.
- [x] 3.6 Prueba: crear una segunda oferta para el mismo `(productId, categoryId)` es rechazado.
- [x] 3.7 Prueba: una oferta que no pertenece a la categoría reclamada es rechazada.
- [x] 3.8 Prueba: categoría activa/inactiva y oferta visible/invisible se incluyen/excluyen correctamente de las consultas públicas.
- [x] 3.9 Prueba: editar `Product.priceFromClp` después de creada una oferta no altera el precio ya publicado de esa oferta.

## 4. Administración — ya completada; extendida en Fase 6 (imágenes de categoría)

- [x] 4.1 `/admin/categories` (listar/crear/editar/reordenar/activar-desactivar/slug/SEO/capabilities/atributos), SUPERADMIN-only.
- [x] 4.2 Sección "Disponibilidad en el catálogo" en `ProductForm.tsx` (ADMIN y SUPERADMIN).
- [x] 4.3 Eliminación bloqueada con ofertas asociadas.
- [x] 4.4 Auditoría de categorías/ofertas.
- [x] 4.5 Prueba: un `ADMIN` no puede alterar la estructura de categorías pero sí puede administrar ofertas.
- [x] 4.6 Prueba: eliminar una categoría con ofertas asociadas queda bloqueado; desactivarla funciona.
- [ ] 4.7 **NUEVA** — extender `CategoryForm.tsx` con el flujo de imagen de categoría (ver Fase 6): esta tarea vive aquí porque es parte de la administración de categorías, ejecutada después de que la Fase 6 defina el pipeline de subida.

## 5. Corrección de taxonomía a dos categorías (bloqueante para 6–16)

- [ ] 5.1 Renombrar in-place la categoría `lentes-de-sol-opticos` → slug `lentes-de-sol`, nombre "Lentes de sol" (mismo `id`, cero ofertas afectadas) — ver design.md → "Migración de datos: dos categorías", paso 1.
- [ ] 5.2 Remapear cada `ProductOffering` de la categoría `armazones` hacia `lentes-opticos`: reasignar `categoryId` cuando el producto no tenga ya una oferta en `lentes-opticos`; listar para revisión manual admin-por-admin los productos que ya tengan ambas (ver design.md, paso 2 — sin criterio de desempate automático, requiere decisión humana).
- [ ] 5.3 Eliminar la fila `Category` de `armazones` una vez confirmado que no le queda ninguna `ProductOffering` (reutilizando el mecanismo ya implementado de bloqueo de borrado con ofertas asociadas como verificación).
- [ ] 5.4 Actualizar `prisma/seed.ts` (tarea 2.2 reabierta): `SEED_CATEGORIES` declara exactamente Lentes ópticos y Lentes de sol; ninguna instalación nueva vuelve a sembrar `armazones`.
- [ ] 5.5 Actualizar la tabla de capabilities de las dos categorías definitivas en el seed (`requiresColor/allowsLensType/allowsTreatments/allowsPrescription/allowsPrescriptionAttachment/allowsLensTint/allowsFrameSelection`) según design.md → "Valores de las dos categorías definitivas".
- [ ] 5.6 Prueba: el remapeo es idempotente (correrlo dos veces no duplica ni vuelve a mover ofertas ya remapeadas).
- [ ] 5.7 Prueba: ninguna `ProductOffering`/`Request` histórica pierde datos durante el remapeo (mismo estándar que 3.4–3.9 y las pruebas de migración de la Fase 15).

## 6. Imágenes de categorías (nueva, ver design.md → "Imágenes de categoría")

- [ ] 6.1 Implementar `processCategoryImage` (o extender `processProductImage` con salida configurable) — validación MIME real vía `sharp`, salida JPEG y opción WebP.
- [ ] 6.2 Implementar subida/reemplazo/eliminación en el bucket público, reutilizando `modules/storage/service.ts` (misma clave de patrón `categories/${categoryId}/cover-${random}.${extension}`).
- [ ] 6.3 Extender `CategoryForm.tsx` con el widget de subida/previsualización/reemplazo/eliminación (reemplaza el `<input>` de texto plano actual para `imagePath`).
- [ ] 6.4 Confirmar el fallback público ya existente (placeholder gris cuando `imagePath` es null) sigue funcionando sin cambios.
- [ ] 6.5 Auditoría: la subida de imagen se registra como parte de `category.updated` (sin acción nueva).
- [ ] 6.6 Prueba: subir/reemplazar/eliminar una imagen de categoría; MIME inválido rechazado; tamaño excedido rechazado.

## 7. Contenido de cristales y tratamientos (nueva, ver design.md → "Contenido de cristales, tratamientos y opciones adicionales")

- [ ] 7.1 Definir `LENS_TYPES`/`LENS_TYPE_LABELS`/`LENS_TYPE_DESCRIPTIONS` (Monofocal, Bifocal, **Progresivo** — reemplaza "Multifocal") en un módulo de código nuevo.
- [ ] 7.2 Definir `TREATMENTS` (Antirreflejo, Filtro de luz azul-violeta, Fotocromático, Protección UV, Mayor resistencia a rayaduras — nunca "completamente antirrayas" —, Hidrofóbico y oleofóbico).
- [ ] 7.3 Definir `ADDITIONAL_OPTIONS` (Alto índice, Polarizado, Degradado, Espejado, Solares graduados con sus tres variantes: solar monofocal, solar progresivo, polarizado graduado cuando exista compatibilidad).
- [ ] 7.4 Definir `quoteOptionsSchema` (Zod, versionado) y la tabla de compatibilidad por categoría (Lentes ópticos vs. Lentes de sol) descrita en design.md.
- [ ] 7.5 Reconstruir la tabla comparativa de `/cristales` con los tres tipos definitivos, accesible (texto "Sí"/"No", no solo color/✓/—).
- [ ] 7.6 Actualizar todas las ocurrencias de "Multifocal" listadas en design.md (`GLASS_TYPES`, `QuoteWizard.tsx`, `/cristales`, `/faq`, ficha de oferta) a "Progresivo" — **excepto** valores ya persistidos en `Request.details` históricos, que no se reescriben.
- [ ] 7.7 Prueba: el enum `glassType` acepta `Progresivo` y rechaza `Multifocal` para nuevas solicitudes; una fila histórica con `Multifocal` se sigue leyendo/mostrando sin error en el panel admin.
- [ ] 7.8 Prueba: la tabla comparativa es navegable/entendible sin depender de color (verificación de accesibilidad).

## 8. Catálogo público adaptado a dos categorías

- [ ] 8.1 (reabre 5.3 original) Actualizar `findDefaultPublicOfferingForProductSlug`: preferir `lentes-opticos` en vez de `armazones` como categoría por defecto para el redirect legado.
- [ ] 8.2 (reemplaza 5.4 original) Actualizar `CATEGORY_CTA_LABELS` a exactamente `{'lentes-opticos': 'Configurar lentes', 'lentes-de-sol': 'Configurar lentes de sol'}`.
- [ ] 8.3 (extiende 5.2 original) Actualizar todo el copy hardcodeado que menciona las tres categorías antiguas (metadata de `/catalogo`, `app/page.tsx`, `app/catalogo/[categorySlug]/[offeringSlug]/page.tsx`) a las dos categorías definitivas.
- [ ] 8.4 (extiende 5.6 original) Actualizar fixtures E2E (`e2e/global-setup.ts`, `e2e/public/catalog.spec.ts`, `e2e/public/forms.spec.ts`, `e2e/a11y/public-pages.spec.ts`) para sembrar/afirmar contra `lentes-opticos`/`lentes-de-sol` en vez de `armazones`.
- [ ] 8.5 Prueba: una URL antigua `/catalogo/armazones/[slug]` (publicada antes del remapeo) redirige correctamente a `/catalogo/lentes-opticos/[slug]` tras la migración.
- [ ] 8.6 Confirmar (sin nueva prueba, por herencia de 5.1/5.5/5.7): el catálogo offering-first, "también disponible como", y la navegación responsive siguen funcionando sin cambio de código contra dos categorías.
- [ ] 8.7 **Gap identificado en esta replanificación**: `app/catalogo/[categorySlug]/[offeringSlug]/page.tsx` hoy no tiene ninguna lógica de fallback para un segmento de categoría legado (a diferencia de `app/catalogo/[categorySlug]/page.tsx`, que sí intenta resolver un slug de producto legado antes de devolver 404). Agregar ese mismo fallback de 3 segmentos: si `categorySlug` no resuelve a una categoría activa, intentar resolver `offeringSlug` como un slug de producto legado y redirigir 308 a su ubicación nueva antes de devolver 404.

## 9. Motor de compatibilidades

- [ ] 9.1 Implementar la resolución server-side de `quoteOptions` por categoría (nunca confiar en un valor de tipo de cristal/tratamiento/opción enviado por el cliente que no esté en el allowlist de la categoría resuelta).
- [ ] 9.2 Prueba: una combinación categoría+tipo de cristal no permitida es rechazada antes de persistir o enviar correo.
- [ ] 9.3 Prueba: cada categoría expone exactamente las opciones de su fila en la tabla de compatibilidad (Lentes ópticos: Monofocal/Bifocal/Progresivo + tratamientos completos; Lentes de sol: sin graduación/solar monofocal/solar progresivo + UV400/polarizado/degradado/espejado/solar graduado).

## 10. Cotizador configurable

- [ ] 10.1 Definir `STEP_DEFINITIONS` y la lógica de pasos activos filtrados por `capabilities` (sin cambios de diseño respecto al original, ver design.md → "Precios y cotizador configurable").
- [ ] 10.2 Reconstruir `QuoteWizard.tsx` como un único componente configurable — reemplaza los pasos actualmente hardcodeados (`GLASS_DESCRIPTIONS`, `TREATMENTS` fijos en el componente) por lecturas del catálogo de la Fase 7 y el motor de compatibilidades de la Fase 9.
- [ ] 10.3 Agregar el paso "opciones adicionales" (nuevo, no existía en el diseño original de tres categorías) gated por la categoría resuelta.
- [ ] 10.4 Reutilizar el paso de adjunto de receta sin cambios, activo únicamente cuando `allowsPrescription && allowsPrescriptionAttachment`.
- [ ] 10.5 Actualizar `modules/requests/service.ts#submitQuote` para re-resolver categoría/oferta/producto/marca/color server-side, autorizar campos según `capabilities` + `quoteOptions` reales de la categoría resuelta; el precio del snapshot se resuelve aquí desde `ProductOffering.priceFromClp`.
- [ ] 10.6 Prueba: los dos flujos (Lentes ópticos / Lentes de sol) muestran exactamente los pasos y opciones esperados.
- [ ] 10.7 Prueba: un par categoría/oferta manipulado es rechazado; un color que no pertenece al producto resuelto es rechazado.
- [ ] 10.8 Prueba: un campo condicionado a una capability o a una opción no otorgada por la categoría nunca se persiste ni se envía por correo.
- [ ] 10.9 Prueba: la ruta de "asesoría" omite los pasos dependientes de un producto específico.

## 11. Snapshot de solicitudes

- [ ] 11.1 Extender `Request.details` con el snapshot de categoría/oferta descrito en `request-category-snapshot`, incluyendo `priceFromSnapshot` resuelto desde `ProductOffering.priceFromClp` — inmutable después.
- [ ] 11.2 Agregar filtro por categoría al listado administrativo de solicitudes.
- [ ] 11.3 Prueba: el snapshot histórico no cambia si luego se edita la categoría/oferta/precio.
- [ ] 11.4 Prueba: el filtro por categoría del inbox administrativo reduce correctamente los resultados.

## 12. Filtros dinámicos (sin dependencia de taxonomía — sin cambios respecto al diseño original)

- [ ] 12.1 Constructor de schema de filtros dinámico por categoría a partir de `CategoryAttributeDefinition`.
- [ ] 12.2 Escopar los filtros comunes existentes dentro de la categoría seleccionada.
- [ ] 12.3 Resolución de query params por allowlist.
- [ ] 12.4 Actualizar `CatalogFilters.tsx` (escritorio + drawer móvil).
- [ ] 12.5 Prueba: query param desconocido descartado; atributo no filtrable no filtrable.
- [ ] 12.6 Prueba: filtros comunes + dinámicos combinados; valor malformado descartado sin error de servidor.

## 13. Emails y WhatsApp — únicamente en cuanto consumen el snapshot de categoría

- [ ] 13.1 Actualizar `quote-customer-confirmation.ts` / `quote-business-notification.ts` (HTML + texto plano) con los campos de categoría/oferta del snapshot de la Fase 11, incluyendo el precio ya snapshotteado.
- [ ] 13.2 Actualizar el mensaje de WhatsApp con el contexto de categoría, mismo precio snapshotteado.
- [ ] 13.3 Prueba: los correos (HTML y texto) incluyen la categoría (Lentes ópticos / Lentes de sol); la mención de receta adjunta no expone archivo, storageKey ni URL privada.

Nota: el rediseño más profundo de plantillas (separación cliente/negocio más allá de lo ya implementado, horario comercial, entrega del logo) vive en el cambio independiente `improve-transactional-emails` — ver design.md → "Dependencias con otros cambios OpenSpec".

## 14. SEO y compatibilidad de rutas

- [ ] 14.1 Metadata por categoría y por oferta, evitando contenido duplicado entre las dos categorías del mismo producto.
- [ ] 14.2 Canonical, `BreadcrumbList`, `ItemList`, `Product`/`Offer` JSON-LD — precio exclusivo de `ProductOffering.priceFromClp`.
- [ ] 14.3 Sitemap (dos categorías + ofertas activas/visibles, sin entradas duplicadas para rutas legadas que solo redirigen — incluyendo las URLs `/catalogo/armazones/*` ya publicadas antes del remapeo).
- [ ] 14.4 Prueba: el mismo producto en Lentes ópticos y Lentes de sol produce dos títulos/canonical distintos.
- [ ] 14.5 Prueba: una oferta sin precio público omite el precio en el schema `Offer`.

## 15. Migración, backfill y corte definitivo

- [ ] 15.1 Ejecutar el script de remapeo de taxonomía (Fase 5) contra una copia de los datos actuales; verificar idempotencia corriendo dos veces.
- [ ] 15.2 Regresión manual completa: cada URL de producto/oferta previamente publicada (incluyendo `/catalogo/armazones/*`) sigue resolviendo.
- [ ] 15.3 Suite completa: lint, typecheck, tests, build — todo en verde dentro de Docker Compose.
- [ ] 15.4 Validación manual en Mailpit de las plantillas de correo actualizadas (categoría y "Progresivo" visibles en HTML y texto).
- [ ] 15.5 `openspec validate redesign-extensible-catalog-v2 --strict`.
- [ ] 15.6 `git diff --check`; confirmar que `design-reference/` permanece sin cambios.
- [ ] 15.7 Confirmar que ningún código de lectura/escritura pública referencia `Product.priceFromClp` fuera del seed histórico.

## 16. Pruebas y cierre

- [ ] 16.1 Regresión completa de accesibilidad (axe) sobre `/catalogo`, `/cristales`, `/cotizador` con el contenido nuevo.
- [ ] 16.2 Regresión completa de Lighthouse sobre las páginas afectadas.
- [ ] 16.3 Confirmar que ninguna referencia a "Multifocal" queda fuera de datos históricos inmutables (ver Fase 7.6).
- [ ] 16.4 Informe final para revisión y aprobación — no archivar el cambio hasta que la implementación sea revisada y aprobada explícitamente.

## Tabla de trazabilidad

| Tarea anterior | Nuevo identificador | Estado | Razón del cambio |
|---|---|---|---|
| 0.1 | 0.1 | sin cambio | — |
| 1.1–1.5 | 1.1–1.5 | sin cambio | — |
| 2.1 | 2.1 | sin cambio | Agnóstica al conteo de categorías |
| 2.2 | 5.4 | **reabierta** | El seed de tres categorías ya no es correcto; reemplazado por el seed de dos categorías |
| 2.3–2.4 | 2.3–2.4 | sin cambio | Comportamiento de idempotencia/fail-closed, agnóstico |
| 3.1–3.9 | 3.1–3.9 | sin cambio | Arquitectura `ProductOffering`, agnóstica a la taxonomía |
| 4.1–4.6 | 4.1–4.6 | sin cambio | Administración de categorías/ofertas, agnóstica al conteo |
| — | 4.7 | **nueva** | Imagen de categoría en el formulario admin (no existía) |
| 5.1 | 8.6 (heredada) | sigue válida | Arquitectura offering-first, sin cambio de código |
| 5.2 | 8.3 | **parcialmente reabierta** | Rutas válidas; copy de tres categorías debe actualizarse |
| 5.3 | 8.1 | **reabierta** | Default de redirect legado hardcodeado a `armazones` |
| 5.4 | 8.2 | **reemplazada** | Mapa de CTA hardcodeado a tres categorías |
| 5.5 | 8.6 (heredada) | sigue válida | Cross-links entre categorías, agnóstico al conteo |
| 5.6 | 8.4, 8.5 | **parcialmente reabierta** | Escenario válido; fixtures/asserts deben actualizarse |
| 5.7 | 8.6 (heredada) | sigue válida | Responsive/estado vacío, agnóstico al conteo |
| 6.1–6.6 | 12.1–12.6 | sin cambio (pendiente) | Filtros dinámicos, sin dependencia de taxonomía |
| 7.1–7.8 | 10.1, 10.2, 10.4–10.9 | reescrita | Se agrega el motor de compatibilidades (Fase 9) y el paso de opciones adicionales (10.3) |
| 8.1 | 11.1 | reescrita | Mismo snapshot, ahora explícitamente ligado a la taxonomía de dos categorías |
| 8.2–8.3 | 13.1–13.2 | reescrita | Separadas del resto del snapshot; alcance acotado a "solo consumir el snapshot" (rediseño más profundo vive en `improve-transactional-emails`) |
| 8.4 | 11.2 | sin cambio | — |
| 8.5–8.7 | 11.3–11.4, 13.3 | sin cambio | — |
| 9.1–9.5 | 14.1–14.5 | reescrita | Slugs de categoría actualizados; incluye las URLs legadas de `armazones` |
| 10.1–10.8 | 15.1–15.7, 16.1–16.4 | reescrita | El backfill original (aditivo) se reemplaza por el remapeo (Fase 5); se separa el cierre final en su propio bloque |
| — | 5.1–5.7 | **nuevas** | Corrección de taxonomía a dos categorías — no existía en el plan original |
| — | 6.1–6.6 | **nuevas** | Imágenes de categoría — no existía en el plan original |
| — | 7.1–7.8 | **nuevas** | Contenido de cristales/tratamientos/opciones — no existía en el plan original |
| — | 9.1–9.3 | **nuevas** | Motor de compatibilidades — no existía en el plan original |

**Total de tareas**: 66 antes (`grep -c '^\- \[[ x]\]'` sobre el `tasks.md` previo a este cambio) → **94 después** (mismo conteo sobre este archivo). **Progreso real recalculado**: **24 tareas completadas** (`[x]`: bloque 0 completo, bloque 1 completo, bloque 2 parcial —2.1/2.3/2.4—, bloque 3 completo, bloque 4 completo) de **94 totales**, equivalente a **25.5%** — comparado con el 32/66 (48.5%) que reportaba el `tasks.md` anterior. La caída de porcentaje refleja fielmente que: (a) la Fase 5 original (7 tareas, todas `[x]`) se reabre/redistribuye en el bloque 8 (6 tareas, todas `[ ]` hasta verificarse contra la nueva taxonomía), (b) la tarea 2.2 se reabre como 5.4, y (c) se agregan 28 tareas netas nuevas (bloques 5, 6, 7, 9 y la extensión 4.7) que no existían en el plan de tres categorías.
