## Context

Pepi Visión 360 solo existe hoy como una maqueta de diseño (`design-reference/`, análisis completo en `docs/design-analysis.md`, `docs/page-inventory.md`, `docs/component-inventory.md` y `docs/functional-gaps.md`). Es una simulación de una sola página construida con el motor de plantillas propietario de la herramienta de diseño; todo su "backend" es en realidad `localStorage` del navegador, su login de administrador está hardcodeado, y no tiene ninguna integración real (correo, almacenamiento de imágenes, notificaciones, autenticación).

Este documento define **cómo** construir la primera versión real de la aplicación, respetando las reglas permanentes de `CLAUDE.md` (monolito modular, Next.js, TypeScript estricto, Tailwind, PostgreSQL, Prisma, Zod, Nginx, Docker Compose; Postgres nunca público; imágenes fuera del contenedor; sin secretos en Git; documentar decisiones; lint+typecheck+tests+build antes de dar por completa una implementación), las 10 decisiones aprobadas para v1, las 4 decisiones de cierre de la actualización anterior (accesibilidad, dominio/DNS vía variables de entorno, modelo de ambientes, persistencia real de derechos ARCO), y **la acotación de alcance** de la actualización anterior (la implementación actual es exclusivamente un entorno de desarrollo local vía Docker Compose).

**Esta actualización reordena las fases de `tasks.md` para que Docker Compose sea la Fase 1**: el entorno de contenedores deja de ser algo que se arma "más adelante" y pasa a ser la base obligatoria sobre la que corre todo el desarrollo desde el primer commit. Ninguna fase posterior asume ni requiere Node, Prisma, PostgreSQL, MinIO, Nginx o Mailpit instalados directamente en el host — ver "Entorno de desarrollo local (Docker Compose)" para la regla de ejecución completa.

`design-reference/` se mantiene como referencia visual/funcional de solo lectura durante todo este proceso — no se migra código desde ahí, se recrea el contenido y los flujos descritos en los documentos de análisis.

## Alcance de esta actualización: solo entorno de desarrollo local

Esta propuesta se acota explícitamente a construir un **entorno de desarrollo local, 100% reproducible con Docker Compose**. Esta sección es la fuente de verdad sobre qué queda dentro y fuera de alcance en materia de infraestructura; el resto del documento se ajusta a ella.

**Dentro de alcance:**
- Un `docker-compose.yml` de desarrollo con los servicios `web`, `postgres`, `migrate`, `minio`, `minio-init`, `mailpit`, `nginx`, y opcionalmente `adminer` (vía profile `tools`).
- Todas las abstracciones de código necesarias para que la aplicación hable con esos servicios locales mediante variables de entorno genéricas (`OBJECT_STORAGE_*`, `SMTP_*`, credenciales de base de datos), de forma que el mismo código funcione más adelante contra proveedores productivos reales sin reescribirse.

**Explícitamente fuera de alcance (no se ejecuta nada de esto en esta implementación):**
- Crear cualquier recurso en AWS (o cualquier otro proveedor cloud).
- Ejecutar AWS CLI.
- Usar herramientas de infraestructura como código: Terraform, CloudFormation, CDK, Pulumi, Ansible o similares.
- Crear instancias Lightsail (ni de ningún otro proveedor).
- Crear buckets, IPs estáticas, registros DNS, certificados TLS o bases de datos administradas.
- Realizar cualquier despliegue.
- Crear pipelines de despliegue hacia infraestructura en la nube.
- Usar credenciales de AWS o LocalStack.

**La infraestructura productiva será creada manualmente por el propietario del proyecto en una etapa posterior, y queda fuera del alcance de esta propuesta.** Todo lo que las versiones anteriores de este documento describían sobre AWS Lightsail (instancia, Object Storage, firewall, despliegue vía GitHub Actions, backups en la nube, ambientes de staging/producción) se retoma como una **propuesta separada y futura**, una vez que esa infraestructura exista. Las decisiones de diseño de esta versión (modelo de datos, módulos, autenticación, abstracciones de storage/correo) se hicieron pensando en que ese salto futuro sea aditivo, no una reescritura.

### Docker Compose es la Fase 1 y la base obligatoria de todo el desarrollo

- El entorno de Docker Compose (ver "Entorno de desarrollo local") se construye **primero**, antes que el propio código de la aplicación. Todas las fases siguientes de `tasks.md` (Fase 2 en adelante) dan por sentado que ese entorno ya existe y corren dentro de él.
- **Ningún comando de la aplicación se ejecuta directamente en el host**: ni `npm`/`npx`, ni el CLI de Prisma, ni los tests, ni el build, ni ninguna otra herramienta de la app. Todos esos comandos se ejecutan **dentro de los contenedores**, mediante `docker compose exec <servicio> <comando>` (si el contenedor ya está corriendo) o `docker compose run --rm <servicio> <comando>` (para una ejecución puntual).
- **El host solo necesita tener instalados Docker y Docker Compose.** No se instala PostgreSQL, MinIO, Nginx ni Mailpit localmente en el host bajo ninguna circunstancia — esos cuatro servicios existen exclusivamente como contenedores de este Compose.
- **Nota de bootstrap**: al momento de construir la Fase 1 todavía no existe código de aplicación (el scaffold de Next.js se completa recién en la Fase 2). El `Dockerfile.dev` y el `compose.yaml` de la Fase 1 se apoyan en un `package.json`/esqueleto mínimo (generado también mediante un comando containerizado de un solo uso, nunca con Node instalado en el host) solo para que el servicio `web` tenga algo que ejecutar y el entorno completo sea verificable de punta a punta; el scaffold real de Next.js/Prisma se construye encima en la Fase 2, sin tocar ni reescribir la infraestructura de la Fase 1.

## Goals / Non-Goals

**Goals:**
- Levantar un entorno de desarrollo completo con un único comando `docker compose up --build`, con healthchecks, `depends_on` con condiciones de salud, red interna propia, y volúmenes persistentes para PostgreSQL y MinIO — **como Fase 1, antes de escribir código de aplicación**, para que todo el desarrollo posterior corra dentro de contenedores desde el primer día.
- Asegurar que ninguna fase posterior necesite instalar Node, Prisma, PostgreSQL, MinIO, Nginx o Mailpit directamente en el host: todo comando de la aplicación se ejecuta vía `docker compose exec`/`docker compose run`.
- Reemplazar cada pieza "simulada" identificada en `docs/functional-gaps.md` por una implementación real: base de datos, autenticación de sesión, almacenamiento de imágenes externo (vía abstracción), notificaciones por correo (vía abstracción) — todo ejecutándose localmente, dentro de ese entorno de contenedores, en esta etapa.
- Preservar el contenido, el recorrido de usuario y el sistema visual ya validados en la maqueta (mismas 13 vistas públicas + panel admin con las mismas 3 áreas funcionales: modelos, solicitudes, configuración — más gestión de comunas, usuarios y solicitudes de derechos ARCO).
- Reemplazar el formulario de derechos ARCO (hoy una simple confirmación en pantalla) por una capacidad real (`data-rights-requests`) que persista, notifique y audite cada solicitud.
- Diseñar una **abstracción de almacenamiento de objetos** (`OBJECT_STORAGE_*`) y una **abstracción de correo SMTP** (`SMTP_*`) que hoy corren contra MinIO y Mailpit locales, y mañana puedan apuntar a un proveedor productivo real sin cambiar el código de la aplicación.
- Mantener el dominio/URL de la aplicación desacoplado del código, configurable únicamente vía `APP_URL`/`NEXT_PUBLIC_APP_URL` (en este entorno, apuntando a `http://localhost:8080`).
- Diseñar el modelo de datos y de permisos para soportar múltiples administradores y roles desde el inicio, aunque v1 solo cree un usuario.
- Alcanzar un nivel de accesibilidad razonable (WCAG 2.1 AA) verificable con herramientas automáticas de bajo costo (axe, Lighthouse CI) más una revisión manual acotada, sin depender de una auditoría externa.

**Non-Goals (explícitamente fuera de alcance de esta implementación):**
- **Cualquier infraestructura o despliegue productivo**: no se crea ni configura nada en AWS (ni Lightsail, ni Object Storage, ni bases de datos administradas, ni DNS, ni certificados TLS), no se usa IaC (Terraform/CloudFormation/CDK/Pulumi/Ansible), no se ejecuta AWS CLI, no se usa LocalStack, y no se realiza ningún despliegue ni se crea ningún pipeline de despliegue hacia infraestructura en la nube. Esto es responsabilidad manual futura del propietario del proyecto.
- HTTPS/TLS: no se configura en este entorno de desarrollo (Nginx local sirve por HTTP en `localhost:8080`); es una preocupación exclusivamente productiva, fuera de alcance aquí.
- Integración con la WhatsApp Business API (se mantiene el enlace `wa.me` con mensaje prellenado).
- Carrito de compra, checkout o pago en línea (el cierre de venta/cotización sigue siendo por WhatsApp).
- ~~Subida o almacenamiento de imágenes de receta óptica~~ — **actualización aprobada durante la implementación**: el cotizador sí permite adjuntar opcionalmente el archivo de la receta, en almacenamiento privado (ver "Almacenamiento privado de adjuntos de solicitudes"). Se mantiene fuera de alcance únicamente para las solicitudes de derechos ARCO (punto siguiente) y para cualquier verificación de identidad basada en el adjunto.
- Adjuntar o almacenar documentos sensibles en las solicitudes de derechos ARCO (mismo principio de minimización de datos que en `quote-requests`; esto no cambió).
- Una arquitectura de catálogo extensible multi-categoría (categorías administrables sin enum, ofertas comerciales por categoría, atributos dinámicos) — `Brand` en esta v1 es una capacidad concreta e inicial, no esa arquitectura; se diseña por separado en `redesign-extensible-catalog-v2`.
- Automatización del borrado/anonimización de solicitudes (comerciales o de derechos ARCO) por vencimiento de retención (se documenta el mecanismo, no se implementa el job).
- Validación legal definitiva de los textos de privacidad/ARCO/términos (se usan como borrador marcado como pendiente).
- Una auditoría de accesibilidad externa/contratada como requisito para este hito.
- Internacionalización (la app es en español, moneda CLP, para el mercado chileno únicamente).

## Especificaciones funcionales

El detalle normativo (requisitos + escenarios, formato SHALL/WHEN/THEN) vive en `specs/<capability>/spec.md`, uno por cada capacidad listada en `proposal.md`. Esta sección resume el alcance funcional y remite a cada spec — el alcance de infraestructura de esta actualización (solo Docker Compose local) no cambia el comportamiento funcional descrito en estas specs, solo dónde corre cada pieza:

| Capacidad | Resumen funcional | Spec |
|---|---|---|
| `public-site` | Páginas informativas (inicio, cristales, nosotros, FAQ, contacto, privacidad, ARCO, términos), navegación global, banner de cookies, configuración de negocio visible en el sitio | `specs/public-site/spec.md` |
| `product-catalog` | Listado de armazones con búsqueda/filtros (incl. marca), ficha de producto con galería por color, productos relacionados | `specs/product-catalog/spec.md` |
| `product-management` | CRUD administrativo de modelos (datos, marca, colores como mutación inmediata, galería de fotos por color, disponibilidad, etiqueta) | `specs/product-management/spec.md` |
| `quote-requests` | Cotizador de 5 pasos (con marca/color resueltos server-side y adjunto opcional/privado de receta), envío de solicitud, notificación por correo HTML+texto, CTA WhatsApp | `specs/quote-requests/spec.md` |
| `home-visit-requests` | Formulario de atención a domicilio validado contra comunas habilitadas, notificación por correo HTML+texto, CTA WhatsApp | `specs/home-visit-requests/spec.md` |
| `request-inbox` | Bandeja administrativa unificada de solicitudes comerciales, filtros, cambio de estado, acceso autenticado a receta adjunta vía URL firmada, retención | `specs/request-inbox/spec.md` |
| `home-visit-coverage` | Gestión administrativa de comunas habilitadas | `specs/home-visit-coverage/spec.md` |
| `business-settings` | Configuración administrativa de datos de contacto/horario/ubicación/retención | `specs/business-settings/spec.md` |
| `admin-auth` | Autenticación por sesión (correo o nombre de usuario), usuarios y roles administradores, auditoría | `specs/admin-auth/spec.md` |
| `product-image-storage` | Subida, validación, redimensionado y entrega de galería de imágenes de producto por color vía la abstracción de almacenamiento de objetos; bucket privado separado para adjuntos sensibles | `specs/product-image-storage/spec.md` |
| `data-rights-requests` | Solicitudes de derechos ARCO persistidas en PostgreSQL, notificación al negocio, flujo de estados y auditoría | `specs/data-rights-requests/spec.md` |

Todas las capacidades son **nuevas** — no existen specs previas en `openspec/specs/` (proyecto sin versión productiva anterior).

## Especificaciones no funcionales

| Categoría | Requisito |
|---|---|
| **Disponibilidad** | Fuera de alcance en esta etapa: no existe un ambiente productivo que tenga un objetivo de disponibilidad todavía. El entorno de desarrollo no tiene requisito de uptime. |
| **Rendimiento** | Páginas públicas renderizadas en el servidor (SSR/ISR según corresponda) con Core Web Vitals razonables; imágenes servidas vía `next/image` apuntando a la abstracción de almacenamiento de objetos; sin JS de terceros bloqueante (se retira la dependencia de Google Fonts CDN). |
| **Seguridad** | Ver sección dedicada "Controles de seguridad" más abajo — acotada a lo relevante en un entorno de desarrollo local. |
| **Accesibilidad** | Objetivo WCAG 2.1 nivel AA. Ver sección dedicada "Estrategia de accesibilidad" para el detalle de comprobaciones automáticas (axe, Lighthouse CI) y la lista de validación manual; no se exige auditoría externa. |
| **Responsive** | Mobile-first con Tailwind; al menos los dos breakpoints observados en el mockup (~1000px, ~560px), evaluando un breakpoint intermedio de tablet si el diseño lo amerita. |
| **Observabilidad** | Logs estructurados (JSON) en la aplicación y en Nginx; registro de auditoría administrativa persistente en base de datos (no solo logs de archivo). |
| **Cumplimiento de datos personales** | Retención configurable de solicitudes (default 12 meses, independiente para comerciales y para derechos ARCO), consentimiento explícito en formularios (checkbox, igual que el mockup), textos legales marcados como borrador hasta validación. |
| **Portabilidad/backup** | Fuera de alcance en esta etapa: no hay datos productivos que respaldar. El volumen persistente de `postgres` sobrevive a reinicios de contenedores dentro del entorno de desarrollo, pero no sustituye un procedimiento de backup — ese procedimiento se define junto con la infraestructura productiva (fuera de esta propuesta). |
| **Mantenibilidad** | TypeScript estricto, Zod para validación en los límites del sistema (formularios y API), estructura de monolito modular por dominio (ver "Arquitectura de módulos"), CI que exige lint + typecheck + tests + build antes de mergear. |
| **Internacionalización** | Fuera de alcance: solo español (Chile), moneda CLP, sin soporte multi-idioma. |

## Estrategia de accesibilidad

- **Objetivo**: WCAG 2.1 nivel AA en las páginas públicas y en el panel de administración.
- **Comprobaciones automáticas**: `axe` (auditoría de accesibilidad) y **Lighthouse CI** integrados al pipeline de CI (ver Fase 9), corriendo sobre las páginas públicas principales y las pantallas clave del panel admin en cada pull request. Un resultado por debajo del umbral acordado (a definir en la implementación, p. ej. score de accesibilidad de Lighthouse) marca el build como fallido, igual que lint/typecheck/tests/build.
- **Lista de validación manual** (a ejecutar al menos una vez, y ante cambios relevantes de UI):
  1. **Teclado**: toda acción alcanzable solo con mouse en el mockup (botones, acordeón FAQ, stepper del cotizador, drawers) debe poder operarse con teclado (Tab/Shift+Tab/Enter/Espacio/Escape), sin trampas de foco.
  2. **Foco**: el foco visible en todo momento; al abrir/cerrar un drawer o panel (menú móvil, filtros de catálogo), el foco se mueve y regresa de forma predecible.
  3. **Formularios**: cada campo con su `<label>` asociado, mensajes de error anunciados (no solo indicados por color), campos obligatorios señalizados de forma perceptible sin depender únicamente del color.
  4. **Contraste**: mínimo 4.5:1 en texto normal y 3:1 en texto grande/elementos gráficos, verificado explícitamente en las combinaciones de marca heredadas del mockup (fucsia/rosado sobre blanco).
  5. **Textos alternativos**: `alt` descriptivo en imágenes de producto y logo; iconos puramente decorativos marcados `aria-hidden`; iconos con significado (WhatsApp, menú, cerrar) con `aria-label`.
  6. **Lector de pantalla**: landmarks (`header`/`nav`/`main`/`footer`), jerarquía de encabezados coherente, y que los estados dinámicos (acordeón FAQ abierto/cerrado, paso actual del cotizador, mensajes de error/éxito) se anuncien correctamente.
- **Sin auditoría externa requerida**: el objetivo es cumplir lo verificable con axe + Lighthouse CI + la lista manual anterior. Una auditoría de accesibilidad externa/contratada queda fuera de alcance (ver Non-Goals) y puede incorporarse en una iteración futura si el negocio lo requiere.

## Modelo de datos

Modelo relacional (PostgreSQL vía Prisma) ilustrativo — el `schema.prisma` real se crea en la Fase 2 de implementación (una vez que el entorno de Docker Compose de la Fase 1 ya existe), no en esta propuesta. Los nombres de campo son orientativos; el detalle exacto de tipos/constraints se resuelve al implementar cada módulo. Este modelo no se ve afectado por la acotación de alcance a Docker Compose local: es el mismo esquema que correrá contra el PostgreSQL local ahora y contra el productivo más adelante.

```
Brand                            # marca comercial del armazón — capacidad concreta inicial de v1;
                                  # ver "Decisiones de modelado" y redesign-extensible-catalog-v2
                                  # para la arquitectura de catálogo multi-categoría que la sucede
  id, name (unique), slug (unique), logoPath (nullable), active (bool),
  sortOrder (int), createdAt, updatedAt

Product
  id, code (unique), name, brandId -> Brand (nullable), gender (enum), shape (enum), material (enum),
  sizes, priceFromClp (int), description, badge (enum, nullable),
  available (bool), createdAt, updatedAt, createdById -> AdminUser, updatedById -> AdminUser

ProductColor
  id, productId -> Product, name, hex
  # @@unique([id, productId]) — permite el FK compuesto de ProductImage
  # abajo; es lo que garantiza a nivel de BD que una fotografía no pueda
  # asociarse a un color de otro producto (ver "Galería de fotografías...").

ProductImage                    # galería ordenable de largo variable, no slots fijos (ver nota abajo)
  id, productId -> Product, productColorId -> ProductColor (FK compuesto
  junto con productId), storageKey, url, width, height,
  sortOrder (int), isCover (bool), altText (nullable), createdAt, updatedAt

Request                         # cotizaciones + atención a domicilio, tabla unificada
  id, type (enum: QUOTE | HOME_VISIT), status (enum: NEW | HANDLED),
  name, phone, email (nullable), comuna (nullable),
  message (nullable), hasPrescription (bool, nullable, solo QUOTE),
  details (json — específico por tipo: armazón/marca/color/cristal/tratamientos para QUOTE;
           tipo de atención para HOME_VISIT),
  consentAcceptedAt, createdAt, retentionExpiresAt, deletedAt (nullable, soft delete)

RequestAttachment                # adjunto privado y opcional de una Request (receta óptica,
                                  # único tipo por ahora) — ver "Almacenamiento privado de
                                  # adjuntos de solicitudes" para la arquitectura completa
  id, requestId -> Request, type (enum: PRESCRIPTION), storageKey,
  originalFileName (sanitizado), mimeType, sizeBytes, checksum (nullable),
  createdAt, deletedAt (nullable, soft delete)

EnabledComuna
  id, name (unique), region (nullable), active (bool), createdAt, updatedAt

BusinessSettings                # fila única (singleton)
  id, whatsappNumber, phoneDisplay, email, instagramHandle,
  hoursText, locationText, requestRetentionMonths (default 12),
  dataRightsRetentionMonths (default 12),
  updatedAt, updatedById -> AdminUser

DataRightsRequest                # solicitudes de derechos ARCO (acceso, rectificación,
                                  # cancelación, oposición, portabilidad, bloqueo)
  id, rightType (enum: ACCESS | RECTIFICATION | CANCELLATION | OPPOSITION | PORTABILITY | BLOCKING),
  name, email, phone (nullable), description,
  status (enum: RECEIVED | IN_REVIEW | RESOLVED | REJECTED),
  resolutionNotes (nullable), resolvedById -> AdminUser (nullable), resolvedAt (nullable),
  consentAcceptedAt, createdAt, updatedAt, retentionExpiresAt, deletedAt (nullable, soft delete)

AdminUser
  id, email (unique), username (unique — añadido para permitir inicio de sesión
  alternativo al correo, ver "Estrategia de autenticación y autorización"),
  passwordHash, name, role (enum: SUPERADMIN | ADMIN),
  active (bool), createdAt, updatedAt

Session                          # sesiones persistidas en BD, no JWT
  id, adminUserId -> AdminUser, tokenHash, ip, userAgent, expiresAt, createdAt

AuditLogEntry
  id, adminUserId -> AdminUser (nullable), action, targetType, targetId,
  metadata (json), ip, createdAt

EmailLog
  id, requestId -> Request (nullable), dataRightsRequestId -> DataRightsRequest (nullable),
  kind (enum: CUSTOMER_CONFIRMATION | BUSINESS_NOTIFICATION | DATA_RIGHTS_NOTIFICATION),
  toAddress, status (enum: SENT | FAILED), providerMessageId (nullable),
  error (nullable), createdAt
```

**Decisiones de modelado:**
- **`Request` unificada con columna `type` + `details` JSON** en vez de dos tablas separadas: la bandeja administrativa (`request-inbox`) necesita listar y filtrar ambos tipos junto, tal como en el mockup. Los campos específicos de cada tipo (armazón/cristal/tratamientos vs. tipo de atención) son minoría y varían poco, por lo que un campo JSON tipado por Zod en la capa de aplicación es más simple que dos tablas con lógica de unión duplicada. Alternativa considerada y descartada: tablas `QuoteRequest`/`HomeVisitRequest` separadas — más "puro" relacionalmente, pero complica la bandeja unificada y la política de retención (habría que aplicarla dos veces).
- **`hasPrescription` sigue siendo un booleano** (tri-estado Sí/No/No estoy seguro colapsado a `bool | null`) que indica si el cliente declara tener receta — **actualización aprobada durante la implementación**: además de esta indicación, `Request` ahora puede tener asociado un `RequestAttachment` (el archivo de la receta), siempre opcional y siempre en almacenamiento privado (ver "Almacenamiento privado de adjuntos de solicitudes"). La decisión original de minimización de datos se mantiene en espíritu: el adjunto es opcional, nunca se exige, y nunca se expone fuera del panel administrativo autenticado.
- **`Brand` es una capacidad concreta e inicial de v1, no una arquitectura de catálogo multi-categoría**: se introdujo para resolver la necesidad real de mostrar y filtrar por marca comercial del armazón. `Product.brandId` es nullable deliberadamente — los productos creados antes de esta adición no tienen marca asignada y no deben quedar inválidos ni perderse; el formulario administrativo exige elegir una marca para altas/ediciones nuevas (validado server-side), pero la base de datos permite que un producto legado quede sin marca hasta que un administrador la complete. `Brand.slug` (no `Brand.name`) es la identidad real de deduplicación (kebab-case, derivado del nombre normalizado), evitando duplicados tipo "Ray-Ban"/"rayban"/"RAY BAN" aunque `name` conserve la grafía comercial exacta para mostrar — mismo patrón de normalización ya usado en `Product.slug` y en `AdminUser.username`. **Una arquitectura de catálogo extensible multi-categoría** (categorías administrables sin enum, ofertas comerciales por categoría, atributos dinámicos, un mismo `Product` ofrecido bajo varias categorías) **se diseña por separado en la propuesta `redesign-extensible-catalog-v2`** — esta propuesta (`add-pepi-vision-360-v1`) no la anticipa ni la sustituye; `Brand` como aquí está modelado permanece válido y reutilizable en ese diseño futuro.
- **`AdminUser.username` (añadido tras la Fase 6)**: permite iniciar sesión con un identificador alternativo al correo. Se backfillea para usuarios ya existentes a partir de la parte local de su correo (normalizada: minúsculas, solo `a-z0-9_.-`, resolviendo colisiones con un sufijo numérico) antes de forzar la restricción `UNIQUE`/`NOT NULL`, de forma que ningún usuario administrador ya creado queda inválido. Ver "Estrategia de autenticación y autorización" para el detalle del flujo de login.
- **Roles como enum (`SUPERADMIN`/`ADMIN`)** en vez de una tabla de permisos granular: suficiente para "múltiples usuarios y roles" en v1 (un rol que puede gestionar usuarios/configuración sensible vs. uno operativo). Si más adelante se necesitan permisos más finos, migrar a una tabla `Permission`/`RolePermission` es un cambio aditivo, no una reescritura.
- **`Session` persistida en base de datos**, no JWT stateless: permite invalidar sesiones (logout real, expiración forzada, ver "Estrategia de autenticación") y es coherente con "autenticación segura basada en sesiones" del stack objetivo.
- **`retentionExpiresAt` calculado al crear la solicitud** (`createdAt` + período de retención vigente en `BusinessSettings` al momento del envío) en vez de calculado al vuelo: permite que un cambio futuro en el período de retención no altere retroactivamente solicitudes ya creadas, y deja el campo listo para que un job de limpieza futuro simplemente consulte `retentionExpiresAt < now()`.
- **`EmailLog`** existe para observabilidad y para poder diagnosticar fallas de entrega de correo sin acoplar ese detalle al propio `Request`/`DataRightsRequest`. En este entorno de desarrollo, cada envío real termina en Mailpit, y `EmailLog` sigue registrando el intento igual que lo haría contra un proveedor productivo.
- **`DataRightsRequest` como tabla separada de `Request`**, no como un tercer `type` dentro de la tabla unificada: tiene un ciclo de vida distinto (4 estados) y una motivación distinta (cumplimiento legal, no interés comercial). Se administra en una sección propia dentro de `/admin/requests` (ver "Arquitectura de módulos"), no en una ruta nueva.
- **`DataRightsRequest` aplica minimización de datos deliberada**: solo captura nombre, correo, teléfono opcional y descripción — sin RUT ni ningún campo de verificación de identidad, y sin adjuntos (ver "Riesgos y decisiones pendientes").
- **`retentionExpiresAt` en `DataRightsRequest`** sigue el mismo patrón que en `Request`, calculado a partir de `dataRightsRetentionMonths` (campo propio en `BusinessSettings`, independiente de `requestRetentionMonths`).
- **`Product.slug` (añadido en la Fase 4 de implementación, no listado en el modelo ilustrativo anterior)**: la ficha pública de producto necesita una ruta estable y legible (`/catalogo/[slug]`). No se reutiliza `code` para esto porque `code` es un dato de gestión interna (editable libremente desde `/admin/products`, ver `product-management`); acoplar la URL pública a un campo mutable rompería enlaces compartidos cada vez que un administrador corrija un código. `slug` se genera una vez a partir del nombre al crear el producto (kebab-case, ASCII, único) y no se regenera automáticamente si el nombre cambia después — así una edición de nombre no rompe URLs ya indexadas o compartidas.
- **Galería de fotografías por color (reemplaza el `ImageSlot` de 3 posiciones fijas de una revisión anterior)**: una fotografía normalmente corresponde al mismo armazón en un color concreto, no a una "vista" (frontal/lateral) — y un producto puede necesitar más de tres fotos. `ProductImage` ahora tiene largo variable, ordenado por `sortOrder` (reasignado consecutivo por la capa de servicio en cada alta/baja/reorden — **no** es una constraint de BD, para evitar tener que usar constraints diferibles solo para permitir intercambiar dos posiciones dentro de una transacción) y con una sola portada por producto (`isCover`, forzado por un índice único parcial de Postgres — `CREATE UNIQUE INDEX ... WHERE "isCover" = true`, no expresable en `schema.prisma`, documentado ahí y creado a mano en la migración). Cada fotografía pertenece a un `ProductColor` mediante una **FK compuesta** `(productColorId, productId) -> ProductColor(id, productId)` (lo que exige `@@unique([id, productId])` en `ProductColor`, redundante con su `id` propio pero necesario para que Postgres acepte el FK compuesto) — así "una fotografía no puede asociarse a un color de otro producto" queda garantizado por la base de datos, no solo por una validación de aplicación (verificado empíricamente: intentar esa asociación cruzada falla con una violación de FK). Como consecuencia, `ProductColor` dejó de poder borrarse y recrearse en cada edición del producto (comportamiento anterior) — la edición de colores ahora hace un diff por `id` (mantener/renombrar/crear) y rechaza explícitamente la eliminación de un color que todavía tenga fotografías asociadas, en vez de dejar que la constraint de BD lo bloquee con un error interno. El límite operativo de fotografías por producto (`MAX_PRODUCT_IMAGES`, documentado en `modules/catalog/README.md`) es una constante de aplicación, no un enum ni una constraint — puede subirse sin migración.

## Arquitectura de módulos

Monolito modular dentro de una sola app Next.js (App Router). Los módulos de dominio son unidades internas con límites claros; no hay microservicios ni despliegues independientes.

```
src/
  app/
    (public)/                # rutas públicas: /, /catalogo, /catalogo/[slug], /cristales,
                              # /cotizador, /domicilio, /nosotros, /faq, /contacto,
                              # /privacidad, /derechos-arco, /terminos
    admin/
      page.tsx                # /admin (login o dashboard si hay sesión)
      products/                # /admin/products
      requests/                # /admin/requests — tabs: Cotizaciones, Atención a domicilio, Derechos ARCO
      home-visits/             # /admin/home-visits
      settings/                # /admin/settings
      users/                   # /admin/users
    api/                      # route handlers cuando no basten server actions
  modules/
    catalog/                  # product-catalog + product-management
    requests/                 # quote-requests + home-visit-requests + request-inbox
    data-rights/               # data-rights-requests: persistencia, notificación, flujo de estados
    home-visit-coverage/
    business-settings/
    auth/                     # admin-auth: sesiones, usuarios, roles, auditoría
    notifications/            # abstracción de correo (SMTP_*), plantillas + envío
    storage/                  # product-image-storage: abstracción de almacenamiento de objetos (OBJECT_STORAGE_*)
    shared/                   # cliente Prisma, logger, helpers Zod, tipos comunes
  components/                 # UI compartida derivada del sistema visual del mockup
```

Cada módulo bajo `modules/` expone: **schemas** (Zod, para validar en los límites del sistema), **repository** (acceso a datos vía Prisma) y **service** (reglas de negocio). Las rutas en `app/` son deliberadamente delgadas: parsean entrada, llaman al service del módulo correspondiente, y renderizan. Esto mantiene el monolito modular (un único deploy, límites internos claros) sin necesidad de separar en servicios independientes — consistente con la arquitectura objetivo de `CLAUDE.md`.

Los módulos `notifications` y `storage` están deliberadamente diseñados como **abstracciones sobre un protocolo estándar** (SMTP y una API compatible con S3, respectivamente) en vez de acoplarse a un SDK de proveedor específico. Esto es lo que permite que, en este entorno de desarrollo, corran contra Mailpit y MinIO, y que el día de mañana solo cambien las variables de entorno (no el código) para apuntar a un proveedor productivo real.

**Nota sobre `/admin/requests` y derechos ARCO**: en vez de introducir una ruta nueva, las solicitudes de derechos ARCO se muestran como una tercera pestaña/sección dentro de `/admin/requests`, con su propio flujo de 4 estados (`RECEIVED`/`IN_REVIEW`/`RESOLVED`/`REJECTED`), claramente diferenciada de la pestaña de solicitudes comerciales (2 estados: nueva/atendida).

## Estrategia de autenticación y autorización

- **Inicio de sesión con correo o nombre de usuario (`username`, actualización aprobada durante la implementación)**: `/admin` acepta un único campo "identificador" que puede ser el correo o el `username` de la cuenta; el servidor resuelve cuál de los dos es mediante una sola búsqueda (`OR` sobre ambas columnas, ambas ya normalizadas a minúsculas al guardarse) y aplica exactamente las mismas reglas de rate limiting, mensaje de error genérico ("Correo/usuario o contraseña incorrectos", sin indicar cuál de los tres — identificador, contraseña, o si la cuenta existe — fue incorrecto) y verificación de cuenta activa, independientemente de qué identificador se usó.
- **Sesión, no JWT stateless**: al iniciar sesión se crea una fila en `Session` (token aleatorio de alta entropía, solo su hash se persiste) y se entrega al navegador como cookie `httpOnly`, `sameSite=lax` (`secure` se activa cuando la app corra bajo HTTPS, es decir, en producción; en este entorno de desarrollo por HTTP local no aplica). Cada request valida la sesión contra la base de datos, lo que permite invalidarla (logout, expiración forzada, bloqueo de usuario) de inmediato.
- **Hash de contraseña**: `argon2id` (o `bcrypt` como alternativa aceptable) — nunca contraseñas ni hashes reversibles; se reemplaza por completo el patrón de la maqueta (usuario/clave hardcodeados en JS del cliente). **Implementado con `bcryptjs`** (decisión de la Fase 6, no `argon2`/`bcrypt` nativos): ambos paquetes nativos requieren compilar un binding en la imagen Alpine (`musl`, no `glibc`) del contenedor `web`, con riesgo de fallas de build específicas de esa combinación (ver historial de incidentes de Node/Alpine de fases anteriores). `bcryptjs` es una reimplementación en JS puro de bcrypt, sin binarios nativos, ampliamente usada y auditada — corresponde exactamente a la alternativa ya aprobada en este mismo párrafo ("o `bcrypt` como alternativa aceptable").
- **Roles**: `SUPERADMIN` (puede gestionar `/admin/users` y `/admin/settings`) y `ADMIN` (puede operar `/admin/products`, `/admin/requests`, `/admin/home-visits`, pero no gestionar usuarios). El primer usuario creado en la Fase 6 es `SUPERADMIN`.
- **Protección de rutas**: no se implementa como `middleware.ts` en la raíz — Prisma requiere runtime Node.js, y el middleware de Next.js corre por defecto en runtime Edge. En su lugar, cada página de `app/admin/**` (excepto la raíz `/admin`, que también actúa como formulario de login) llama a `requireSession()`/`requireRole()` de `modules/auth/service.ts` al inicio de su Server Component, redirigiendo a `/admin` si la sesión no es válida; toda mutación (server action) vuelve a validar sesión y rol de forma independiente, nunca confiando en el estado del cliente ni en qué botones muestra la interfaz.
- **Expiración de sesión: duración fija, no deslizante**: `Session.expiresAt` se fija una sola vez al iniciar sesión (60 minutos) y no se extiende en cada request. Motivo: Next.js solo permite modificar cookies (`cookies().set()`) desde una Server Action o Route Handler, nunca desde el render de un Server Component — por lo que no es posible refrescar de forma fiable el `maxAge` de la cookie en cada carga de página. Extender solo el `expiresAt` en base de datos sin extender la cookie no aporta nada, porque el navegador de todos modos deja de enviar la cookie una vez vencido su `maxAge` original. Una sesión deslizante real requeriría un middleware Node (o un Route Handler intermedio) — no se justifica para este alcance; una expiración fija de 60 minutos ya cumple el escenario de la especificación ("expiración de sesión").
- **Auditoría**: cada acción administrativa sensible (login, logout, crear/editar/eliminar producto, cambiar estado o eliminar solicitud comercial, cambiar estado de solicitud de derechos ARCO, editar configuración de negocio, editar comunas habilitadas, crear/editar/desactivar usuario) escribe una fila en `AuditLogEntry` con actor, acción, entidad afectada e IP. El registro de auditoría es de solo-inserción (append-only) desde la aplicación.
- **Contra fuerza bruta**: límite de intentos de login por IP/usuario en una ventana de tiempo (ver "Controles de seguridad").
- **Sin parámetro de redirección tras login**: a diferencia de un patrón común (`?next=/admin/products`), el login siempre redirige a `/admin` tras autenticar. Evita por completo la superficie de open redirect en vez de tener que sanitizar un parámetro.

## Estrategia de almacenamiento de imágenes

- **Abstracción configurable, no un proveedor hardcodeado**: la aplicación habla contra un almacenamiento de objetos compatible con S3 a través de variables de entorno — `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_REGION`, `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_ACCESS_KEY`, `OBJECT_STORAGE_SECRET_KEY`, `OBJECT_STORAGE_FORCE_PATH_STYLE` — nunca el sistema de archivos del contenedor de la aplicación (regla permanente de `CLAUDE.md`).
- **En este entorno de desarrollo**: el backend es el servicio `minio` del Docker Compose (ver "Entorno de desarrollo local"), con `OBJECT_STORAGE_FORCE_PATH_STYLE=true` (requerido por MinIO) y el bucket creado automáticamente por `minio-init`.
- **Proveedor productivo**: se decide cuando se aprovisione la infraestructura productiva (fuera de esta propuesta); gracias a la abstracción, ese cambio es solo de configuración (variables de entorno), no de código.
- **Flujo de subida**: el navegador sube el archivo a una ruta del servidor (no al almacenamiento directamente, para poder validar/redimensionar antes de persistir) → el servidor valida tipo MIME y tamaño máximo → redimensiona/optimiza con una librería server-side (reemplazando el resize por `<canvas>` del navegador que hace el mockup) → sube el resultado al almacenamiento de objetos → guarda `storageKey` + URL en `ProductImage`.
- **Acceso**: imágenes de producto se sirven como contenido público de solo lectura (no son datos sensibles); solo la aplicación (vía credenciales de servicio) puede escribir. En desarrollo, el job `minio-init` (Fase 1) ejecuta además `mc anonymous set download` sobre el bucket (añadido en la Fase 7) para habilitar la lectura anónima — sin esto, MinIO deja el bucket privado por defecto y ninguna URL guardada en `ProductImage.url` cargaría en un navegador.
- **`OBJECT_STORAGE_PUBLIC_URL` (variable añadida en la Fase 7, no prevista en el listado original)**: `OBJECT_STORAGE_ENDPOINT` (`http://minio:9000`) es el hostname interno de Docker que solo el contenedor `web` puede resolver — usado para las llamadas servidor-a-servidor (subida/eliminación). Un navegador en el host no puede resolver `minio`, por lo que las URLs guardadas en `ProductImage.url` usan en cambio `OBJECT_STORAGE_PUBLIC_URL` (`http://localhost:9000` en desarrollo, ya que el puerto de MinIO está publicado en `127.0.0.1:9000`). Ambas variables apuntan al mismo bucket; la distinción es puramente sobre qué red puede resolver cada hostname. En producción, si el proveedor de almacenamiento expone un único dominio público accesible tanto por el servidor como por el navegador, ambas variables pueden coincidir.
- **Cliente S3**: `@aws-sdk/client-s3` (SDK oficial de AWS, protocolo S3 estándar — no un SDK propietario de MinIO), con `forcePathStyle` según `OBJECT_STORAGE_FORCE_PATH_STYLE`.
- **Procesamiento de imágenes**: `sharp` (server-side, con binarios prebuilt para Alpine/musl — se verificó explícitamente que instala y corre en la imagen `node:22-alpine` del contenedor `web` antes de adoptarla, dado el precedente de `bcryptjs` con `argon2`/`bcrypt` nativos en la Fase 6). Redimensiona a un máximo de 1200px por lado (sin ampliar imágenes más pequeñas) y reencoda siempre a JPEG calidad 82 — esto es lo que satisface el requisito de "procesamiento server-side" del spec, independientemente de si `next/image` puede optimizar la entrega (ver el punto siguiente).
- **Optimización de entrega — limitación conocida de este entorno**: `next/image` se sigue usando como componente de renderizado (lazy-loading, `alt`, prevención de CLS), pero con la prop `unoptimized` en los componentes públicos de catálogo/ficha y en la previsualización del panel admin. Motivo: el optimizador integrado de Next.js rechaza —de forma no configurable, por diseño, como protección contra SSRF— cualquier imagen cuyo host resuelva a una dirección de red privada (loopback, rangos RFC 1918), sin importar lo que declare `remotePatterns`. MinIO en este entorno **siempre** resuelve a una dirección privada (la IP interna de Docker, o `127.0.0.1` vía el puerto publicado), por lo que el redimensionado/reformateo en tiempo de request de `next/image` nunca puede completarse aquí — se verificó empíricamente (log: `upstream image ... resolved to private ip`). Esto no compromete el requisito funcional porque el redimensionado/optimización real ya ocurre server-side al subir la imagen (punto anterior); lo único que se pierde es la generación de `srcset`/negociación de formato en tiempo de entrega. Un proveedor productivo con un endpoint verdaderamente público no tendría esta restricción y podría quitar `unoptimized` sin ningún otro cambio de código.
- **Reemplaza directamente** el patrón identificado en `docs/functional-gaps.md` sección 2 (imágenes base64 dentro de `localStorage`, sin límite de tamaño real, sin optimización real).

## Almacenamiento privado de adjuntos de solicitudes (actualización aprobada durante la implementación)

Las fotografías de producto (sección anterior) son contenido público de solo lectura. Una receta óptica adjunta a una cotización **es un dato privado del cliente** y nunca debe tratarse con el mismo modelo de acceso — esta sección documenta esa separación explícita.

- **Bucket separado**: `PRIVATE_OBJECT_STORAGE_BUCKET` (variable de entorno propia, distinta de `OBJECT_STORAGE_BUCKET`), creado automáticamente por `minio-init` igual que el bucket público, pero **sin** `mc anonymous set download` — permanece privado por defecto (`mc anonymous set none`, explícito). Nunca se guarda ni se construye una URL pública permanente contra este bucket, a diferencia de `ProductImage.url`.
- **Qué se sube**: el archivo se valida en el servidor por tipo MIME declarado (`application/pdf`, `image/jpeg`, `image/png`, `image/webp` únicamente) y tamaño máximo (10 MB), y además se verifica que el **contenido real** del archivo corresponda al tipo declarado (firma `%PDF` para PDF; decodificación real vía la misma librería de procesamiento de imágenes del servidor para JPG/PNG/WebP) — un archivo cuyo contenido no coincide con lo declarado se rechaza, sin importar la extensión o el `Content-Type` que el navegador haya enviado.
- **Nombre de archivo sanitizado**: el nombre original se limpia de cualquier ruta y caracteres de control antes de guardarse (`RequestAttachment.originalFileName`); nunca se persiste el nombre crudo del sistema de archivos del cliente.
- **Flujo transaccional**: (1) validar metadata y contenido del archivo — sin tocar almacenamiento todavía; (2) resolver producto/color/marca de la cotización (puede fallar por razones no relacionadas con el archivo, y en tal caso el archivo nunca se sube); (3) subir el archivo al bucket privado; (4) crear `Request` + `RequestAttachment` en una sola operación atómica; (5) si la persistencia en PostgreSQL falla después de subir el archivo, el objeto recién subido se elimina del bucket como compensación (nunca queda un archivo huérfano); (6) las notificaciones por correo solo se envían después de que la solicitud quedó persistida exitosamente.
- **Acceso administrativo**: nunca una URL pública. El panel administrativo (`request-inbox`) muestra que existe un adjunto (tipo, nombre, tamaño) y ofrece verlo/descargarlo mediante una acción autenticada que, tras verificar sesión y autorización server-side, genera una **URL firmada de corta duración** (60 segundos) contra el bucket privado y la entrega al navegador del administrador. Cada generación de URL firmada (cada "vista" o "descarga") queda registrada en `AuditLogEntry`. El bucket privado en sí nunca se expone directamente al cliente.
- **En los correos transaccionales**: cuando una cotización incluye un adjunto, el correo al negocio únicamente indica que existe una receta adjunta disponible en el panel administrativo — nunca incluye el archivo como adjunto de correo, ni su `storageKey`, ni una URL (firmada o no) hacia él. Ver "Estrategia de correo" más abajo.
- **`RequestAttachment` como tabla separada** (no un campo `Json` dentro de `Request.details`) precisamente para poder aplicarle sus propias reglas de acceso/almacenamiento sin mezclarlas con el resto del detalle de la solicitud, y para permitir soft-delete independiente (`deletedAt`) sin alterar el resto de `Request`.

## Estrategia de correo

- **Abstracción SMTP, no un proveedor hardcodeado**: la aplicación envía correo mediante un cliente SMTP estándar configurado con `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`.
- **En este entorno de desarrollo**: `SMTP_HOST` apunta al servicio `mailpit` del Docker Compose, sin autenticación real (`SMTP_USER`/`SMTP_PASSWORD` pueden quedar vacíos o con valores dummy); ningún correo sale nunca a un destinatario real — todos quedan capturados en la interfaz web de Mailpit para inspección durante el desarrollo y las pruebas.
- **Proveedor productivo**: se decide cuando se aprovisione la infraestructura productiva (fuera de esta propuesta); gracias a la abstracción SMTP, ese cambio es solo de configuración.
- **Disparadores**: al enviar una `Request` (cotización o atención a domicilio) válida, se envían dos correos — confirmación al cliente (si dejó correo) y notificación al negocio (dirección configurada en `business-settings`). Al crearse una `DataRightsRequest`, se envía una notificación al negocio (sin confirmación al cliente, según lo aprobado).
- **No bloqueante**: el envío de correo ocurre después de persistir la solicitud (nunca se pierde si el correo falla); cada intento se registra en `EmailLog` con su resultado.
- **Reintentos**: no se implementa una cola de reintentos automáticos en esta etapa; un fallo queda registrado en `EmailLog` como `FAILED`.
- **Plantillas — HTML profesional + texto plano equivalente, siempre ambos (actualización aprobada durante la implementación)**: cada correo transaccional (confirmación de cotización, notificación de cotización al negocio, confirmación de atención a domicilio, notificación de atención a domicilio, notificación de derechos ARCO) se genera con `subject` + `html` + `text`, enviados simultáneamente por Nodemailer — nunca solo uno de los dos. El HTML está pensado para clientes de correo reales, no para un navegador: ancho máximo ~600px, layout basado en tablas, estilos inline, sin JavaScript, sin formularios, sin dependencias de fuentes remotas (misma pila seguras Arial/Helvetica que el resto de la regla de self-hosted fonts), sin imágenes en base64. Un componente/función reutilizable arma el documento (encabezado con logo, banda de marca, tarjeta de información, botón de llamada a la acción, aviso, pie de página corporativo) para no duplicar el HTML completo por plantilla.
- **Branding**: colores tomados de los mismos tokens de marca del sitio público (azul marino, fucsia/rosado, verde para WhatsApp/estados positivos), logo de Pepi Visión 360 mediante una **URL absoluta configurable** (`EMAIL_ASSET_BASE_URL`, con `APP_URL` como respaldo si no se define) — nunca una ruta relativa ni un host interno de Docker, porque un cliente de correo no puede resolver ninguno de los dos. El logo incluye `alt` descriptivo y un texto de marca visible junto al logo como respaldo si el cliente de correo bloquea imágenes.
- **Escape de contenido dinámico**: todo texto proveniente de un formulario público (nombre, mensaje, comuna, correo, teléfono, marca/modelo/color resueltos, descripción de una solicitud ARCO) se escapa antes de insertarse en el HTML, para prevenir inyección de HTML/scripts a través de un campo de texto libre.
- **Nunca se expone en un correo**: el archivo de una receta adjunta, su `storageKey`, ninguna URL (firmada o no) hacia el bucket privado, contraseñas, tokens, ni ningún otro dato técnico interno — ver "Almacenamiento privado de adjuntos de solicitudes".
- **Remitente y entregabilidad (actualización aprobada durante la implementación)**: el remitente incluye un nombre visible (no solo una dirección), y el "Responder a" nunca es la dirección `no-reply` — en un correo al cliente apunta al correo real de contacto del negocio, y en un correo al negocio apunta al correo del cliente cuando existe, para permitir responder con un clic. Se agregan las cabeceras `Auto-Submitted: auto-generated` y `X-Auto-Response-Suppress: All` (RFC 3834) para señalar correo transaccional automático. El transporte SMTP admite TLS configurable (`SMTP_SECURE`, `SMTP_REQUIRE_TLS`, ambos en `false` en este entorno porque Mailpit no soporta TLS) y firma DKIM opcional (`DKIM_DOMAIN_NAME`, `DKIM_KEY_SELECTOR`, `DKIM_PRIVATE_KEY`, las tres en blanco en desarrollo). SPF y DMARC son registros DNS del dominio real de envío — quedan fuera del alcance de esta propuesta (ver "Infraestructura productiva"), documentados aquí como requisito pendiente para el despliegue productivo.

## Controles de seguridad

Acotados a lo relevante para un entorno de desarrollo local — los controles específicamente productivos (HTTPS obligatorio, firewall de una instancia en la nube, gestión de secretos de un proveedor de despliegue) se definirán junto con la infraestructura productiva, fuera de esta propuesta.

- **PostgreSQL y MinIO nunca expuestos más allá de `localhost`**: ambos servicios publican sus puertos únicamente en `127.0.0.1` (no en `0.0.0.0` ni en la red de la LAN), y solo son alcanzables por otros servicios a través de la red interna de Docker Compose.
- **Secretos fuera de Git**: todas las credenciales (base de datos, MinIO, SMTP, secreto de sesión) viven en variables de entorno (`.env`, ignorado por Git); `compose.yaml` **nunca** contiene valores secretos hardcodeados, solo referencias a variables de entorno. Se provee `.env.example` sin valores reales.
- **Validación en los límites del sistema**: todo input de formularios públicos y del panel admin se valida con Zod tanto en cliente (UX) como en servidor (autoridad real) — reemplaza las validaciones triviales y bypasseables del mockup.
- **Rate limiting**: límite de intentos en el login de administración y en los formularios públicos (cotizador, domicilio, ARCO) por IP/ventana de tiempo, para mitigar fuerza bruta y spam — implementación en memoria de la propia instancia es suficiente para este alcance (no se introduce Redis). Se implementa en la Fase 8 (ver tarea 8.1).
- **Honeypot en formularios públicos (añadido en la Fase 5, no listado originalmente en esta sección)**: cada uno de los tres formularios públicos (cotizador, domicilio, ARCO) incluye un campo oculto adicional (`website`, fuera de los schemas de negocio, invisible y no anunciado a lectores de pantalla) que un visitante humano nunca completa. Si llega con un valor, el envío se descarta silenciosamente (no se persiste `Request`/`DataRightsRequest`, no se envía correo) pero igual se muestra la pantalla de éxito al remitente, para no revelar el mecanismo a un bot. Es una mitigación distinta y complementaria al rate limiting de la Fase 8: no requiere estado compartido entre requests, por lo que tiene sentido resolverla ya en la capa de validación de esta fase.
- **Cabeceras de seguridad**: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, configuradas en Nginx o en el propio Next.js (aplicables incluso sin HTTPS en desarrollo).
- **CSRF**: mitigado por cookies `sameSite=lax` + verificación de origen en mutaciones del panel admin (server actions/route handlers).
- **Principio de mínimo privilegio**: el usuario de base de datos que usa la aplicación tiene solo los permisos necesarios sobre su propio esquema (no superusuario de Postgres), incluso en desarrollo.
- **Dependencias**: `npm audit`/Dependabot (o equivalente) como parte de CI para detectar vulnerabilidades conocidas.
- **Auditoría administrativa** (detallada en la sección de autenticación) como control de trazabilidad.
- **Sin credenciales de AWS en ningún lado**: ni en código, ni en `.env.example`, ni en el propio `.env` de desarrollo — esta implementación no las necesita.
- **Adjuntos privados de solicitudes nunca en el bucket público (actualización aprobada durante la implementación)**: la receta óptica adjunta a una cotización vive en un bucket separado (`PRIVATE_OBJECT_STORAGE_BUCKET`) sin acceso anónimo y sin URL pública permanente; el único acceso es una URL firmada de corta duración generada tras autenticación y autorización, con cada acceso auditado — ver "Almacenamiento privado de adjuntos de solicitudes".

## Entorno de desarrollo local (Docker Compose) — Fase 1

Toda la infraestructura de esta propuesta se reduce a un `compose.yaml` (más `Dockerfile.dev` para `web`, `.dockerignore`, `.env.example` y la configuración local de Nginx) que cualquier persona del equipo puede levantar con:

```
docker compose up --build
```

sin necesitar ninguna cuenta ni credencial de un proveedor cloud, y sin instalar nada más que Docker y Docker Compose en el host. Esta es la **Fase 1** de `tasks.md`: se construye antes que el propio código de la aplicación y es la base obligatoria de todas las fases siguientes. Servicios:

| Servicio | Rol | Notas clave |
|---|---|---|
| **`web`** | Aplicación Next.js, TypeScript estricto | Hot reload; código fuente montado por volumen (bind mount) desde el host; puerto interno `3000` (no publicado directamente al host — solo alcanzable a través de `nginx`); healthcheck sobre un endpoint propio de salud. **Actualización aprobada durante la implementación**: `logging.serverFunctions` deshabilitado explícitamente (el logging por defecto de Server Actions en modo dev de Next.js imprimiría contraseñas en texto plano en `docker compose logs web` para acciones como el login); límite de tamaño de Server Actions (`experimental.serverActions.bodySizeLimit`) alineado a 10 MB con el límite de imágenes de producto (ver fila `nginx`). |
| **`postgres`** | Base de datos | Imagen con **versión fijada** (no `latest`); volumen persistente nombrado; healthcheck (`pg_isready`); `POSTGRES_DB`/`POSTGRES_USER`/`POSTGRES_PASSWORD` desde variables de entorno; puerto publicado únicamente en `127.0.0.1` (nunca en `0.0.0.0`). |
| **`migrate`** | Job puntual | Usa la misma imagen/código que `web`; ejecuta las migraciones de Prisma contra `postgres`; `depends_on: postgres` con condición `service_healthy`; no queda corriendo (sale con código 0 tras aplicar las migraciones — comportamiento esperado, no un error). |
| **`minio`** | Almacenamiento de objetos local (S3-compatible) | Volumen persistente nombrado; healthcheck propio; expone API y consola web; credenciales (`MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`) desde variables de entorno; puertos publicados únicamente en `127.0.0.1`. |
| **`minio-init`** | Job puntual | Espera a que `minio` esté `service_healthy`; crea automáticamente el bucket (`OBJECT_STORAGE_BUCKET`) si no existe; no queda corriendo tras completar la tarea. |
| **`mailpit`** | SMTP local para desarrollo | Recibe cualquier correo que la app envíe vía `SMTP_HOST=mailpit`; expone su interfaz web para inspeccionar los mensajes; **no reenvía nada a destinatarios reales**. |
| **`nginx`** | Reverse proxy local | Publica la aplicación en `http://localhost:8080`; hace proxy hacia `web:3000`; soporta cabeceras `Upgrade`/`Connection` para que el hot reload (WebSocket) de Next.js funcione a través del proxy; **sin HTTPS** en este entorno. Reenvía `Host`/`X-Forwarded-Host` usando `$http_host` (no `$host`, que descarta el puerto) más `X-Forwarded-Proto`/`X-Forwarded-Port` — necesario para que la verificación de mismo origen de los Server Actions de Next.js (que compara `Origin` contra el host reconstruido a partir de estas cabeceras) no rechace las peticiones legítimas del navegador en `:8080` con "Invalid Server Actions request" (bug corregido post-Fase 7, ver `nginx/dev.conf`). **Actualización aprobada durante la implementación**: `client_max_body_size 10m`, alineado con el límite de Server Actions de `web`, para que la subida de fotografías de producto no sea rechazada por el proxy antes de llegar a la aplicación. |
| **`adminer`** *(opcional)* | Explorador de base de datos | Bajo el profile `tools` (`docker compose --profile tools up`), **no** se levanta con el `docker compose up --build` estándar; no es obligatorio para correr la aplicación. |

**Requisitos transversales del `docker-compose.yml`:**
- Todos los servicios comparten una **red interna** propia de Compose (los servicios se resuelven entre sí por nombre: `postgres`, `minio`, `mailpit`, `web`).
- **Volúmenes persistentes nombrados** para `postgres` y `minio`: los datos sobreviven a `docker compose down` (sin `-v`) y a reinicios de contenedores.
- **Healthchecks** en `web`, `postgres` y `minio`; **`depends_on` con condiciones de salud** (`service_healthy` / `service_completed_successfully`) donde corresponda, en vez de un simple orden de arranque sin verificación.
- **Ningún puerto de `postgres` o `minio` expuesto** a una interfaz distinta de `127.0.0.1` (nunca `0.0.0.0`, nunca la red local/LAN).
- **Sin secretos en `compose.yaml`**: todos los valores sensibles se referencian desde variables de entorno (`.env`), nunca escritos en claro en el propio archivo de Compose.
- **`.env.example`** documenta todas las variables necesarias, sin valores reales; **`.env`** permanece en `.gitignore` (ya lo está).
- **`.dockerignore`** excluye del contexto de build lo que no debe copiarse a la imagen (`node_modules`, `.git`, `.next`, `.env`, etc.), manteniendo el build de `web` rápido y sin filtrar secretos locales.
- **Sin credenciales de AWS, sin LocalStack**: MinIO y Mailpit son suficientes para simular almacenamiento de objetos y correo en desarrollo; no se introduce ninguna emulación de servicios AWS.

**Variables de entorno relevantes** (documentadas en `.env.example`, sin valores reales):

| Variable | Propósito |
|---|---|
| `APP_URL`, `NEXT_PUBLIC_APP_URL` | URL de la app; en este entorno, `http://localhost:8080`. |
| `DATABASE_URL` (o `POSTGRES_DB`/`POSTGRES_USER`/`POSTGRES_PASSWORD` + host `postgres`) | Conexión de Prisma/`web`/`migrate` a la base de datos. |
| `SESSION_SECRET` | Firma de sesiones (`admin-auth`). |
| `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_REGION`, `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_ACCESS_KEY`, `OBJECT_STORAGE_SECRET_KEY`, `OBJECT_STORAGE_FORCE_PATH_STYLE` | Abstracción de almacenamiento de objetos (`product-image-storage`); en desarrollo apuntan a `minio`. |
| `OBJECT_STORAGE_PUBLIC_URL` (Fase 7) | Base URL accesible desde el navegador para las imágenes de producto — distinta de `OBJECT_STORAGE_ENDPOINT` (servidor-a-servidor, hostname interno de Docker). |
| `PRIVATE_OBJECT_STORAGE_BUCKET` (actualización aprobada durante la implementación) | Bucket separado y privado (sin acceso anónimo, sin `*_PUBLIC_URL` propio) para adjuntos sensibles de solicitudes (recetas) — ver "Almacenamiento privado de adjuntos de solicitudes". |
| `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` | Credenciales del propio contenedor `minio` (en desarrollo, pueden coincidir con `OBJECT_STORAGE_ACCESS_KEY`/`SECRET_KEY` por simplicidad; en producción el proveedor real definirá sus propias credenciales de menor privilegio). |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Abstracción de correo (`notifications`); en desarrollo apuntan a `mailpit` sin autenticación real. |
| `SMTP_SECURE`, `SMTP_REQUIRE_TLS` (actualización aprobada durante la implementación) | Postura TLS de la conexión SMTP — ambas en `false` en este entorno (Mailpit no soporta TLS); un proveedor productivo real debe activar al menos una. |
| `DKIM_DOMAIN_NAME`, `DKIM_KEY_SELECTOR`, `DKIM_PRIVATE_KEY` (actualización aprobada durante la implementación) | Firma DKIM opcional del correo saliente — las tres en blanco en desarrollo (Mailpit no valida firmas); se activan juntas cuando exista un dominio de envío productivo real con su clave pública publicada en DNS. |
| `EMAIL_ASSET_BASE_URL` (actualización aprobada durante la implementación) | Base URL absoluta para assets dentro de correos (el logo) — opcional, usa `APP_URL` como respaldo si no se define; nunca una ruta relativa ni un hostname interno de Docker. |

## Infraestructura productiva

**Fuera del alcance de esta propuesta.** La infraestructura productiva (instancia, red, TLS/certificados, DNS, base de datos gestionada o no, object storage productivo, backups en la nube, CI/CD de despliegue, ambientes de staging) será creada y configurada **manualmente por el propietario del proyecto en una etapa posterior**, y se abordará como una propuesta separada cuando corresponda. Esta implementación no crea, aprovisiona ni automatiza nada de eso.

## Plan de pruebas

- **Unitarias**: schemas Zod (validación de formularios y de payloads de API) y lógica de negocio pura de cada `service` de módulo (p. ej. cálculo de `retentionExpiresAt`, filtrado de catálogo, reglas de disponibilidad de comuna).
- **Integración**: repositorios Prisma y route handlers/server actions contra una base de datos de pruebas (contenedor Postgres efímero), cubriendo al menos: creación/edición/borrado de producto, envío de cotización y de consulta de domicilio (incluye verificación de que se registra el intento de envío de correo en `EmailLog`, capturable en Mailpit), login/logout de admin, cambio de estado de una solicitud, gestión de comunas habilitadas.
- **End-to-end** (Playwright u equivalente), corriendo contra el propio entorno de Docker Compose:
  - Visitante navega catálogo, filtra, entra a una ficha, inicia el cotizador y completa los 5 pasos hasta ver la pantalla de éxito.
  - Visitante envía una consulta de atención a domicilio para una comuna habilitada y para una no habilitada.
  - Administrador inicia sesión, crea un producto con fotos (verificando que la imagen termina en el bucket de MinIO), lo edita, lo elimina.
  - Administrador revisa la bandeja de solicitudes, cambia el estado de una a "atendida".
  - Administrador gestiona la lista de comunas habilitadas.
  - Administrador (rol `SUPERADMIN`) crea un segundo usuario administrador; un usuario `ADMIN` intenta acceder a `/admin/users` y es rechazado.
  - Visitante envía una solicitud de derechos ARCO; un administrador la ve en `/admin/requests` (sección Derechos ARCO), la mueve a "en revisión" y luego a "resuelta" con una nota de resolución.
  - Verificación de que un correo enviado por la aplicación (confirmación o notificación) aparece efectivamente en Mailpit (vía su API o su interfaz), como sustituto de un proveedor real.
- **Verificación del entorno Docker Compose** (no es un test de la aplicación en sí, sino del propio entorno):
  - `docker compose config` no reporta errores.
  - `docker compose up --build` levanta todos los servicios requeridos (excluyendo `adminer`, que solo aparece bajo el profile `tools`).
  - `postgres` y `minio` alcanzan estado `healthy`.
  - El bucket configurado se crea automáticamente vía `minio-init`.
  - Las migraciones de Prisma pueden ejecutarse desde el servicio `migrate`.
  - `nginx` publica la app en `http://localhost:8080` y el hot reload de Next.js sigue funcionando a través del proxy.
  - Reiniciar los contenedores (`docker compose restart` / `down` sin `-v` seguido de `up`) no elimina los datos de `postgres` ni de `minio`.
- **Accesibilidad**: `axe` y **Lighthouse CI** integrados al pipeline de CI, corriendo sobre las páginas públicas principales y las pantallas clave del panel admin en cada pull request; complementado con la lista de validación manual antes de considerar el hito completo.
- **Gate de CI**: lint + typecheck + tests + build (incluyendo las comprobaciones de accesibilidad) deben pasar antes de mergear a la rama principal (regla permanente de `CLAUDE.md`). No hay gate de despliegue en esta etapa porque no hay despliegue.

## Criterios de aceptación

Para considerar completo el alcance descrito en esta propuesta (entorno de desarrollo local):

1. Todas las vistas públicas del mockup (`docs/page-inventory.md`) existen como rutas reales de Next.js con el mismo contenido/flujo, sirviendo datos desde PostgreSQL (no datos hardcodeados en el bundle de la app, salvo contenido puramente editorial que no cambia).
2. El catálogo, las solicitudes, la configuración de negocio, las comunas habilitadas y los usuarios administradores persisten en PostgreSQL y sobreviven a un reinicio completo del stack de Docker Compose (sin `localStorage` de por medio para nada de esto).
3. El login de administrador exige credenciales reales contra la base de datos, con contraseña hasheada y sesión invalidable; no existen credenciales hardcodeadas en el código ni visibles en la UI.
4. Las imágenes de producto se sirven a través de la abstracción de almacenamiento de objetos (MinIO en este entorno); ninguna imagen de producto se almacena en base64 dentro de la base de datos ni en el sistema de archivos del contenedor de la app.
5. Al enviar una cotización o una consulta de domicilio válida, se registra en `EmailLog` un intento de correo al cliente (si dejó correo) y uno al negocio, capturables en Mailpit, además de mostrarse el CTA de continuar por WhatsApp.
6. La lista de comunas habilitadas es editable desde `/admin/home-visits` y el formulario público de atención a domicilio la respeta.
7. Existe al menos un usuario `SUPERADMIN` capaz de crear otros usuarios administradores con rol `ADMIN`; un usuario `ADMIN` no puede acceder a `/admin/users`.
8. Toda acción administrativa sensible queda registrada en `AuditLogEntry` con actor, acción y timestamp.
9. Las comprobaciones automáticas de accesibilidad (`axe` y Lighthouse CI) corren en CI, y la lista de validación manual se ejecuta y documenta al menos una vez; no se exige auditoría externa.
10. El dominio/URL de la aplicación se resuelve exclusivamente a partir de `APP_URL`/`NEXT_PUBLIC_APP_URL` (en este entorno, `http://localhost:8080`); no existe ningún dominio ni proveedor DNS hardcodeado en el código.
11. Las solicitudes de derechos ARCO persisten en PostgreSQL (`DataRightsRequest`), son visibles y gestionables en `/admin/requests` (sección Derechos ARCO) con su flujo de estados, generan una notificación por correo al negocio, cada cambio de estado queda registrado en `AuditLogEntry`, y no se adjunta ni almacena ningún documento sensible en ellas.
12. `docker compose config` no presenta errores.
13. `docker compose up --build` levanta todos los servicios requeridos (`web`, `postgres`, `migrate`, `minio`, `minio-init`, `mailpit`, `nginx`); `adminer` no se levanta salvo que se invoque explícitamente el profile `tools`.
14. `postgres` alcanza estado `healthy`.
15. `minio` alcanza estado `healthy`.
16. El bucket local se crea automáticamente por `minio-init`.
17. Mailpit recibe los correos generados por la aplicación (confirmaciones y notificaciones).
18. `nginx` publica la aplicación en `http://localhost:8080`.
19. Next.js mantiene hot reload a través del proxy de `nginx`.
20. Las migraciones de Prisma pueden ejecutarse desde el servicio `migrate`.
21. Reiniciar los contenedores no elimina los datos persistentes de `postgres` ni de `minio`.
22. No existe código de aprovisionamiento de AWS (ni Terraform/CloudFormation/CDK/Pulumi/Ansible) en el repositorio.
23. No se realiza ninguna llamada hacia AWS durante el desarrollo, las pruebas, ni el arranque del entorno.
24. `design-reference/` permanece intacto y sin modificaciones.
25. Ningún comando de la aplicación (`npm`, Prisma, tests, build) se ejecuta directamente en el host: todos corren dentro de contenedores vía `docker compose exec`/`docker compose run`, verificable inspeccionando los scripts/documentación del repositorio.
26. El host solo requiere tener instalados Docker y Docker Compose; no hay ninguna instalación local de PostgreSQL, MinIO, Nginx ni Mailpit fuera de los contenedores del propio `compose.yaml`.

**Actualizaciones aprobadas durante la implementación (adicionales a los 26 criterios originales):**

27. Un administrador puede iniciar sesión en `/admin` usando su nombre de usuario además de su correo, con el mismo mensaje de error genérico ante credenciales inválidas independientemente del identificador usado.
28. Cada producto tiene una galería de fotografías de largo variable (no limitada a 3 posiciones fijas), cada fotografía asociada a uno de los colores del producto, con orden explícito y una portada designable; agregar o quitar un color se refleja de inmediato tanto en el selector de colores como en la galería, sin necesidad de guardar el formulario completo y volver a entrar.
29. Cada producto puede tener una marca (`Brand`) asignada; el catálogo público permite filtrar por marca y la muestra en tarjetas, ficha de producto y cotizador; el panel administrativo permite seleccionarla desde una lista de marcas activas. Los productos existentes antes de esta adición permanecen válidos sin marca asignada.
30. El cotizador permite adjuntar opcionalmente el archivo de una receta óptica (PDF/JPG/PNG/WebP, máximo 10 MB); el archivo se almacena en un bucket privado sin acceso anónimo y sin URL pública permanente; un administrador autenticado puede verlo/descargarlo mediante una URL firmada de corta duración, y cada acceso queda registrado en `AuditLogEntry`.
31. Cada correo transaccional se genera con una versión HTML profesional (compatible con clientes de correo reales) y una versión de texto plano equivalente, enviadas simultáneamente; el HTML incluye el logo mediante una URL absoluta configurable, escapa todo contenido dinámico, y nunca incluye el archivo de una receta adjunta ni su referencia de almacenamiento.

## Riesgos / Trade-offs

| Riesgo | Mitigación |
|---|---|
| MinIO y Mailpit no son idénticos a los proveedores productivos que se elijan más adelante — un comportamiento que "funciona" en desarrollo podría no ser idéntico en producción | Las abstracciones `OBJECT_STORAGE_*`/`SMTP_*` se diseñan contra protocolos estándar (S3, SMTP), no contra APIs propietarias de MinIO/Mailpit, minimizando la superficie de divergencia; validar contra el proveedor productivo real como parte de la futura propuesta de infraestructura. |
| Nadie define todavía HTTPS, backups, ni un plan de disponibilidad porque toda la infraestructura productiva está fuera de alcance | Documentado explícitamente como trabajo futuro (ver "Infraestructura productiva"); no bloquea el desarrollo de la aplicación en sí. |
| Rate limiting en memoria (sin Redis) se resetea al reiniciar la app | Aceptable para un entorno de desarrollo/instancia única; documentado como upgrade path futuro si hace falta. |
| Contenido legal (privacidad/ARCO/términos) reutilizado del mockup sin validar | Marcado explícitamente como borrador en la UI hasta recibir validación legal. |
| Tentación de reintroducir el patrón de imágenes base64 (más simple de implementar) durante el desarrollo | Enforced como no-goal explícito en este documento y en `product-image-storage`; revisar en code review. |
| `details` JSON en `Request` pierde algo de la seguridad de tipos de un esquema totalmente relacional | Mitigado con un schema Zod estricto por `type` que valida el contenido de `details` en cada punto de entrada/salida. |
| Retención configurable sin job de limpieza automático puede acumular datos indefinidamente si nadie construye el job futuro | Documentado explícitamente como trabajo pendiente, con el campo `retentionExpiresAt` ya listo para que ese job solo tenga que consultarlo. |
| Un solo administrador inicial (`SUPERADMIN`) es también punto único de falla operativa | El modelo de roles permite crear un segundo `SUPERADMIN` en cualquier momento. |
| `DataRightsRequest` no incluye verificación de identidad (p. ej. RUT), a diferencia del formulario ARCO de la maqueta | Decisión deliberada de minimización de datos; validar con negocio/legal si se requiere verificación de identidad antes de resolver una solicitud real. |
| Mezclar solicitudes comerciales (2 estados) y de derechos ARCO (4 estados) dentro de la misma ruta `/admin/requests` puede confundir a los administradores | Sección/tab claramente diferenciada ("Derechos ARCO") con su propio flujo de estados. |
| Ejecutar comprobaciones de accesibilidad (axe/Lighthouse CI) sin un umbral numérico acordado puede volverse un gate ignorable o, al revés, bloquear builds por regresiones menores | Definir el umbral concreto (score mínimo, cero violaciones críticas de axe) al implementar el pipeline en la Fase 9. |
| Confundir "MinIO/Mailpit en desarrollo" con "la solución productiva" y nunca migrar a un proveedor real | Este documento y `proposal.md` dejan explícito, repetidamente, que la infraestructura productiva es una propuesta futura separada — no una extensión automática de este entorno. |
| Confundir `Brand` (capacidad concreta de v1) con la arquitectura de catálogo multi-categoría | Documentado explícitamente en "Decisiones de modelado" y en `proposal.md`: `Brand` no anticipa ni sustituye el diseño de `redesign-extensible-catalog-v2`, que se aborda como propuesta separada. |
| Un adjunto privado de receta mal configurado (bucket equivocado, ACL anónima por error) expondría datos sensibles del cliente | Bucket separado del de fotografías de producto, creado con `mc anonymous set none` explícito (no solo "no llamar `set download`"), verificado empíricamente (acceso anónimo directo devuelve 403); único acceso vía URL firmada de 60 segundos generada tras autenticación. |
| Sin SPF/DKIM/DMARC configurados (dependen de un dominio de envío productivo real, fuera de este alcance), los correos podrían clasificarse como spam en un despliegue productivo | DKIM ya soportado por el código (activación por variables de entorno cuando exista el dominio); SPF/DMARC documentados como requisito pendiente de la infraestructura productiva, no de esta implementación. |

## Riesgos y decisiones pendientes

**Nota de alcance**: las decisiones específicas de infraestructura productiva (proveedor de correo final, proveedor de object storage final, tamaño de instancia, política de rotación de backups, HTTPS/TLS, DNS/dominio definitivo, CI/CD de despliegue, ambientes de staging/producción) **no se tratan en esta propuesta** — se retoman en la futura propuesta de infraestructura productiva, cuando el propietario del proyecto la aprovisione manualmente. Lo único que esta propuesta fija de antemano es que esas piezas deben ser configurables por variable de entorno (`OBJECT_STORAGE_*`, `SMTP_*`, `APP_URL`/`NEXT_PUBLIC_APP_URL`), para que ese cambio futuro no requiera reescribir código.

Preguntas que sí siguen abiertas dentro del alcance de esta implementación (no bloquean el inicio de la Fase 1, pero deben resolverse antes de las fases que dependen de ellas):

1. **Verificación de identidad en solicitudes de derechos ARCO**: `DataRightsRequest` no incluye RUT ni ningún otro campo de verificación de identidad, a diferencia del formulario ARCO de la maqueta. Es una decisión deliberada de minimización de datos, pero queda pendiente confirmar con el negocio/un responsable legal si la normativa exige verificar identidad antes de resolver una solicitud real.
2. **Umbral de accesibilidad en CI**: se decide usar axe + Lighthouse CI, pero el umbral numérico exacto que hace fallar el build queda para definirse durante la implementación (Fase 9).
3. **Validación legal de privacidad/ARCO/términos**: pendiente de un responsable legal/del negocio; hasta entonces el contenido se marca como borrador en la propia UI.
4. **Mecanismo futuro de borrado/anonimización por retención**: esta propuesta documenta el campo `retentionExpiresAt` (en `Request` y en `DataRightsRequest`) y la configuración de ambos períodos, pero el job que efectivamente borra/anonimiza datos vencidos **no se construye en esta etapa** — queda como trabajo futuro explícito.
5. **Credenciales de MinIO/Mailpit en desarrollo**: si `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD` coinciden 1:1 con `OBJECT_STORAGE_ACCESS_KEY`/`SECRET_KEY`, o si se crean credenciales de aplicación separadas con menor privilegio dentro del propio MinIO, se resuelve como detalle de implementación en la Fase 1/7 — no cambia el contrato de las variables de entorno hacia la aplicación.

## Migration Plan

No aplica una migración desde un sistema productivo previo (no existe ninguno). El "rollout" de esta propuesta es la secuencia de fases descrita en `tasks.md`, acotada a un entorno de desarrollo local (Entorno local Docker Compose → Fundación técnica Next.js y Prisma → Sitio público → Catálogo y productos → Formularios y solicitudes → Autenticación y administración → Almacenamiento de imágenes → Seguridad, auditoría y accesibilidad → Pruebas y CI → Infraestructura productiva fuera de alcance). Docker Compose deliberadamente **abre** la secuencia, no la cierra: todo el código de las fases 2 a 9 se escribe y se corre desde el primer momento dentro de los contenedores que la Fase 1 deja funcionando. El contenido inicial del catálogo puede poblarse a partir de los 10 modelos de ejemplo (`SEED`) de `design-reference/` como datos de arranque/demo en el entorno local — decisión de producto, no técnica, y no bloquea esta propuesta. El despliegue a un entorno productivo real es una propuesta futura separada, condicionada a que el propietario del proyecto aprovisione manualmente esa infraestructura.

## Open Questions

Ver "Riesgos y decisiones pendientes" arriba — se consolidan ahí en vez de duplicarse en esta sección para evitar inconsistencias entre ambas listas.
