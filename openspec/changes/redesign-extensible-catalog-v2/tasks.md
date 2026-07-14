## 0. Precondición de secuencia (bloqueante, no iniciar el resto sin esto)

- [ ] 0.1 Confirmar que `add-pepi-vision-360-v1` está completado y archivado (`openspec/specs/` contiene sus capacidades). No iniciar la Fase 1 antes de esto — ver design.md → "Secuencia con `add-pepi-vision-360-v1`".

## 1. Modelo y migración

- [ ] 1.1 Agregar `Category`, `ProductOffering`, `CategoryAttributeDefinition`, `ProductOfferingAttributeValue` y el enum `CategoryAttributeType` a `prisma/schema.prisma` — estrictamente aditivo, sin alterar `Product`, `ProductColor`, `ProductImage`, `Brand` o `Request`. `Product.priceFromClp` se mantiene sin cambios (fase de compatibilidad).
- [ ] 1.2 Generar y aplicar la migración Prisma dentro de Docker Compose (`docker compose run --rm migrate`).
- [ ] 1.3 Verificar vía `psql` que `Product`/`ProductColor`/`ProductImage`/`Brand`/`Request`/`RequestAttachment` quedan exactamente igual tras la migración (ningún row alterado/eliminado).
- [ ] 1.4 Implementar `categoryCapabilitiesSchema` (Zod) con los siete campos finales (`requiresColor`, `allowsLensType`, `allowsTreatments`, `allowsPrescription`, `allowsPrescriptionAttachment`, `allowsLensTint`, `allowsFrameSelection`) y sus defaults — parseo estricto en escritura, fail-closed en lectura.
- [ ] 1.5 Implementar `offeringConfigurationSchema` (Zod, versionado con `discriminatedUnion`) para `ProductOffering.configuration` — ver design.md → "`ProductOffering.configuration`" para ejemplos válidos/inválidos.

## 2. Categorías y seed inicial

- [ ] 2.1 Implementar repositorio/servicio de `Category` (CRUD, validación de capabilities, slugify + unicidad al estilo `Brand`).
- [ ] 2.2 Extender `prisma/seed.ts` con un seed idempotente (`upsert` por slug) de las tres categorías iniciales: Armazones, Lentes ópticos, Lentes de sol ópticos.
- [ ] 2.3 Prueba: correr el seed dos veces no duplica categorías.
- [ ] 2.4 Prueba: capabilities malformadas se rechazan al escribir y se tratan como "sin capacidades opcionales" al leer.

## 3. ProductOfferings

- [ ] 3.1 Implementar repositorio/servicio de `ProductOffering` (crear/actualizar/soft-delete), con `@@unique([productId, categoryId])` y `@@unique([categoryId, slug])`.
- [ ] 3.2 Implementar el helper de verificación de pertenencia (una oferta referenciada realmente pertenece a la categoría/producto reclamados).
- [ ] 3.3 Migrar todas las lecturas públicas de precio (catálogo, ficha, cotizador, correos, WhatsApp, schema SEO `Offer`) para leer exclusivamente `ProductOffering.priceFromClp`; dejar `Product.priceFromClp` solo como valor semilla de la primera oferta — ver design.md → "Fase de compatibilidad de precios".
- [ ] 3.4 Prueba: un mismo `Product` en dos categorías no duplica `ProductColor` ni `ProductImage`.
- [ ] 3.5 Prueba: precios distintos por categoría para el mismo `Product`.
- [ ] 3.6 Prueba: crear una segunda oferta para el mismo `(productId, categoryId)` es rechazado.
- [ ] 3.7 Prueba: una oferta que no pertenece a la categoría reclamada es rechazada.
- [ ] 3.8 Prueba: categoría activa/inactiva y oferta visible/invisible se incluyen/excluyen correctamente de las consultas públicas.
- [ ] 3.9 Prueba: editar `Product.priceFromClp` después de creada una oferta no altera el precio ya publicado de esa oferta.

## 4. Administración

- [ ] 4.1 Construir `/admin/categories` (listar/crear/editar/reordenar/activar-desactivar/slug/SEO/capabilities/atributos) con Server Actions restringidas a `SUPERADMIN`.
- [ ] 4.2 Agregar la sección "Disponibilidad en el catálogo" a `ProductForm.tsx` + Server Actions correspondientes (permitido para `ADMIN` y `SUPERADMIN`). Actualizar el copy del campo base `priceFromClp` del producto para dejar explícito que es un valor de referencia/semilla, no el precio público (ver design.md → "Fase de compatibilidad de precios").
- [ ] 4.3 Implementar el patrón de eliminación bloqueada cuando existen ofertas asociadas (mismo patrón que `removeProductColor`), prefiriendo desactivación.
- [ ] 4.4 Registrar auditoría (`category.created/updated/enabled/disabled/attributes_updated`, `offering.created/updated/enabled/disabled`).
- [ ] 4.5 Prueba: un `ADMIN` no puede alterar la estructura de categorías pero sí puede administrar ofertas.
- [ ] 4.6 Prueba: eliminar una categoría con ofertas asociadas queda bloqueado; desactivarla funciona.

## 5. Catálogo público

- [ ] 5.1 Reconstruir `modules/catalog/*` con `ProductOffering` como entidad principal de lectura pública.
- [ ] 5.2 Construir `/catalogo` (selector de categorías), `/catalogo/[categorySlug]` (listado + filtros), `/catalogo/[categorySlug]/[offeringSlug]` (detalle).
- [ ] 5.3 Implementar la capa de compatibilidad: `/catalogo/[slug]` resuelve la oferta por defecto del producto y redirige (308) a su URL por categoría.
- [ ] 5.4 Actualizar la tarjeta de oferta con CTA específico por categoría ("Ver armazón" / "Configurar lentes" / "Configurar lentes de sol ópticos").
- [ ] 5.5 Agregar en la ficha de oferta el bloque "También disponible como" (enlaces cruzados entre categorías del mismo producto).
- [ ] 5.6 Prueba: una URL antigua redirige correctamente; un producto sin ninguna oferta visible sigue devolviendo 404.
- [ ] 5.7 Prueba: navegación responsive (mobile/tablet/desktop) y estado vacío por categoría.

## 6. Filtros dinámicos

- [ ] 6.1 Implementar el constructor de schema de filtros dinámico por categoría a partir de `CategoryAttributeDefinition` (`filterable: true`, `active: true`).
- [ ] 6.2 Escopar los filtros comunes existentes (marca/público/forma/material/color/precio/disponibilidad/búsqueda) dentro de la categoría seleccionada.
- [ ] 6.3 Implementar la resolución de query params por allowlist (nunca una clave arbitraria del navegador interpolada en una consulta Prisma).
- [ ] 6.4 Actualizar `CatalogFilters.tsx` (escritorio + drawer móvil) para renderizar filtros dinámicos y mantener "Limpiar filtros".
- [ ] 6.5 Prueba: un query param desconocido se descarta; un atributo no `filterable` no es filtrable aunque exista.
- [ ] 6.6 Prueba: filtros comunes + dinámicos combinados; un valor malformado se descarta sin error de servidor.

## 7. Cotizador configurable

- [ ] 7.1 Definir `STEP_DEFINITIONS` y la lógica de pasos activos filtrados por `capabilities`.
- [ ] 7.2 Reconstruir `QuoteWizard.tsx` como un único componente configurable (no tres wizards paralelos).
- [ ] 7.3 Reutilizar el paso de adjunto de receta sin cambios, activo únicamente cuando `allowsPrescription && allowsPrescriptionAttachment` son ambos verdaderos.
- [ ] 7.4 Actualizar `modules/requests/service.ts#submitQuote` (o su sucesor) para re-resolver categoría/oferta/producto/marca/color server-side y autorizar campos según las `capabilities` reales de la categoría resuelta.
- [ ] 7.5 Prueba: los tres flujos (armazón / óptico / solar óptico) muestran exactamente los pasos esperados.
- [ ] 7.6 Prueba: un par categoría/oferta manipulado es rechazado; un color que no pertenece al producto resuelto es rechazado.
- [ ] 7.7 Prueba: un campo condicionado a una capability no otorgada por la categoría nunca se persiste ni se envía por correo.
- [ ] 7.8 Prueba: la ruta de "asesoría" omite los pasos dependientes de un producto específico.

## 8. Emails, WhatsApp y solicitudes

- [ ] 8.1 Extender `Request.details` (JSON, sin migración) con el snapshot de categoría/oferta descrito en `request-category-snapshot`.
- [ ] 8.2 Actualizar `quote-customer-confirmation.ts` / `quote-business-notification.ts` (HTML + texto plano) con los campos de categoría/oferta.
- [ ] 8.3 Actualizar el mensaje de WhatsApp con el contexto de categoría.
- [ ] 8.4 Agregar filtro por categoría al listado administrativo de solicitudes.
- [ ] 8.5 Prueba: el snapshot histórico de `Request.details` no cambia si luego se edita la categoría/oferta/precio.
- [ ] 8.6 Prueba: los correos (HTML y texto) incluyen la categoría; la mención de receta adjunta no expone archivo, storageKey ni URL privada.
- [ ] 8.7 Prueba: el filtro por categoría del inbox administrativo reduce correctamente los resultados.

## 9. SEO y compatibilidad de rutas

- [ ] 9.1 Metadata por categoría y por oferta (título/descripción con fallback), evitando contenido duplicado entre categorías del mismo producto.
- [ ] 9.2 Canonical, `BreadcrumbList`, `ItemList`, `Product`/`Offer` JSON-LD (precio solo cuando `priceFromClp` no es nulo).
- [ ] 9.3 Sitemap (categorías + ofertas activas/visibles, sin entradas duplicadas para rutas legadas que solo redirigen).
- [ ] 9.4 Prueba: el mismo producto en dos categorías produce dos títulos/canonical distintos.
- [ ] 9.5 Prueba: una oferta sin precio público omite el precio en el schema `Offer`.

## 10. Pruebas, migración y validación final

- [ ] 10.1 Ejecutar el script de migración (categorías + ofertas Armazones) contra una copia de los datos actuales; verificar idempotencia corriendo dos veces.
- [ ] 10.2 Regresión manual completa: cada URL de producto previamente publicada sigue resolviendo (ahora vía redirect).
- [ ] 10.3 Suite completa: lint, typecheck, tests, build — todo en verde dentro de Docker Compose.
- [ ] 10.4 Validación manual en Mailpit de las plantillas de correo actualizadas (categoría visible en HTML y texto).
- [ ] 10.5 `openspec validate redesign-extensible-catalog-v2 --strict`.
- [ ] 10.6 `git diff --check`; confirmar que `design-reference/` permanece sin cambios.
- [ ] 10.7 Confirmar que ningún código de lectura/escritura pública referencia `Product.priceFromClp` fuera del seed histórico — registrar el resultado como precondición para el futuro cambio de limpieza que elimine la columna (fuera de alcance de este cambio).
- [ ] 10.8 Informe final para revisión y aprobación — no archivar el cambio hasta que la implementación sea revisada y aprobada explícitamente.
