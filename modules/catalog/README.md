# modules/catalog

`product-catalog`: repositorio y servicio de solo lectura sobre `Product`
para el sitio público (`/catalogo`, `/catalogo/[slug]`), implementado en la
Fase 4. Expone `schemas` (filtros de catálogo vía Zod), `repository`
(consultas Prisma, solo `visible: true`) y `service` (DTOs con etiquetas en
español, precios formateados y enlaces de WhatsApp).

`product-management` (CRUD administrativo en `/admin/products`, Fase 6):
`admin-schemas.ts` (formulario de alta/edición, colores), `admin-repository.ts`
(listado con KPIs, alta/edición/eliminación, chequeo de código único) y
`admin-service.ts` (genera `slug` único a partir del nombre, valida código
duplicado, registra auditoría). El toggle "publicar/despublicar" usa
`Product.visible`, independiente de `available` (disponibilidad de stock).
