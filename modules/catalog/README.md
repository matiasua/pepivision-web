# modules/catalog

`product-catalog`: repositorio y servicio de solo lectura sobre `Product`
para el sitio público (`/catalogo`, `/catalogo/[slug]`), implementado en la
Fase 4. Expone `schemas` (filtros de catálogo vía Zod), `repository`
(consultas Prisma) y `service` (DTOs con etiquetas en español, precios
formateados y enlaces de WhatsApp).

`product-management` (CRUD administrativo en `/admin/products`) todavía no
se implementa aquí: depende de `admin-auth` (Fase 5) y se agrega a este
mismo módulo cuando esa fase esté disponible.
