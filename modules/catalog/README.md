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
Los colores (`ProductColor`) son entidades estables una vez que una foto
puede referenciarlas. Desde un ajuste posterior, ya **no** se guardan junto
con el resto del formulario (`updateProduct()` no los toca en absoluto):
agregar/quitar un color en un producto ya existente es una mutación propia
e inmediata (`addProductColor()`/`removeProductColor()`/
`reassignAndRemoveProductColor()`, expuestas como Server Actions propias en
`app/admin/products/actions.ts`), persistida al instante contra Postgres y
reflejada de inmediato tanto en el selector de colores como en la galería
de fotografías de `ProductForm.tsx` — ambas leen el mismo estado
(`colors`), no dos copias independientes. Si el admin intenta quitar un
color que todavía tiene fotos asociadas, la mutación se rechaza (o, si
elige reasignar, mueve esas fotos a otro color del mismo producto dentro
de una transacción y luego elimina el color) en vez de dejar que la FK
compuesta de `ProductImage` lo bloquee con un error interno. Para un
producto nuevo (sin id todavía), los colores siguen siendo enteramente
locales hasta el primer guardado — recién ahí existe un `productId` real al
que asociar una fotografía, y el formulario redirige automáticamente a la
pantalla de edición de ese producto (no al listado) para habilitar la
carga de fotos sin un segundo viaje manual.

`Brand`: marca comercial del armazón, modelo separado y `Product.brandId`
**nullable a propósito** — ver `prisma/schema.prisma` y
`prisma/migrations/20260715000000_add_brand_and_request_attachment`. Los
productos existentes antes de esta migración quedan sin marca (no se
inventó ninguna ni se creó un "Sin marca" placeholder) hasta que un
administrador la asigne; el formulario exige elegir una marca activa para
altas/ediciones nuevas, validado server-side (`assertActiveBrand()`,
nunca confiando en el `brandId` recibido del navegador). `prisma/seed.ts`
siembra una fila `Brand` por cada logo real en `public/marcas/` (vía
`lib/brands.ts#getBrandLogos()` — la misma fuente que usa el carrusel de
inicio, evitando dos fuentes de verdad contradictorias) y asigna una marca
real a cada producto de ejemplo, de forma idempotente (upsert por `slug`).

`product-image-storage` (Fase 7, rediseñado en un ajuste posterior — ver
`prisma/migrations/20260714000000_product_image_gallery`): reemplaza el
modelo de 3 posiciones fijas (`ImageSlot` MAIN/FRONT/SIDE) por una galería
ordenable de largo variable, donde cada fotografía pertenece a un color del
producto (`productColorId`, FK compuesta junto con `productId` — garantiza
a nivel de BD que una foto no pueda asociarse a un color de otro
producto). `admin-service.ts` expone `uploadProductImage()`,
`replaceProductImage()`, `deleteProductImage()`, `changeProductImageColor()`,
`setCoverImage()` y `reorderProductImages()` — validan el archivo
(`modules/storage/schemas.ts`), lo procesan (`lib/image-processing.ts`,
`sharp`), lo suben a MinIO (`modules/storage/service.ts`) y persisten la
referencia en `ProductImage`. Reemplazar una fotografía sube y persiste el
objeto nuevo antes de borrar el anterior (nunca al revés). Como máximo una
fotografía por producto puede ser portada (`isCover`, forzado por un índice
único parcial de Postgres creado a mano en la migración, no expresable en
`schema.prisma`); al eliminar la portada, la siguiente por `sortOrder` la
reemplaza automáticamente. `sortOrder` se reasigna consecutivo por esta capa
de servicio en cada alta/baja/reorden — no es una constraint de BD.
`MAX_PRODUCT_IMAGES` (en `admin-schemas.ts`, actualmente 20, nunca por
debajo de 12) es el límite operativo de fotografías por producto: una
constante de aplicación, no un enum ni una constraint, así que puede subirse
sin migración. Eliminar un producto también borra sus objetos del bucket
(no solo las filas, que ya hacían cascade-delete).
