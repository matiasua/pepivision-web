## Context

Pepi Visión 360 solo existe hoy como una maqueta de diseño (`design-reference/`, análisis completo en `docs/design-analysis.md`, `docs/page-inventory.md`, `docs/component-inventory.md` y `docs/functional-gaps.md`). Es una simulación de una sola página construida con el motor de plantillas propietario de la herramienta de diseño; todo su "backend" es en realidad `localStorage` del navegador, su login de administrador está hardcodeado, y no tiene ninguna integración real (correo, almacenamiento de imágenes, notificaciones, autenticación).

Este documento define **cómo** construir la primera versión productiva real, respetando las reglas permanentes de `CLAUDE.md` (monolito modular, Next.js, TypeScript estricto, Tailwind, PostgreSQL, Prisma, Zod, Nginx, Docker Compose, AWS Lightsail; Postgres nunca público; imágenes fuera del contenedor; sin secretos en Git; documentar decisiones; lint+typecheck+tests+build antes de dar por completa una implementación), las 10 decisiones aprobadas para v1 (ver `proposal.md`) y las 4 decisiones de cierre incorporadas en esta actualización: alcance de accesibilidad, manejo de dominio/DNS vía variables de entorno, modelo de ambientes (desarrollo/validación local/producción/staging efímero con aprobación manual de despliegue), y persistencia real de las solicitudes de derechos ARCO (`data-rights-requests`).

`design-reference/` se mantiene como referencia visual/funcional de solo lectura durante todo este proceso — no se migra código desde ahí, se recrea el contenido y los flujos descritos en los documentos de análisis.

## Goals / Non-Goals

**Goals:**
- Reemplazar cada pieza "simulada" identificada en `docs/functional-gaps.md` por una implementación real: base de datos, autenticación de sesión, almacenamiento de imágenes externo, notificaciones por correo.
- Preservar el contenido, el recorrido de usuario y el sistema visual ya validados en la maqueta (mismas 13 vistas públicas + panel admin con las mismas 3 áreas funcionales: modelos, solicitudes, configuración — más gestión de comunas, usuarios y solicitudes de derechos ARCO, nuevas en v1).
- Reemplazar el formulario de derechos ARCO (hoy una simple confirmación en pantalla) por una capacidad real (`data-rights-requests`) que persista, notifique y audite cada solicitud.
- Dejar la aplicación desplegable de forma reproducible en AWS Lightsail vía Docker Compose + Nginx + GitHub Actions, con backups diarios verificables, un modelo de ambientes explícito (desarrollo, validación local con build productivo, producción, staging efímero) y aprobación manual obligatoria antes de desplegar a producción.
- Mantener el dominio/URL de la aplicación desacoplado del código, configurable únicamente vía `APP_URL`/`NEXT_PUBLIC_APP_URL`.
- Diseñar el modelo de datos y de permisos para soportar múltiples administradores y roles desde el inicio, aunque v1 solo cree un usuario.
- Alcanzar un nivel de accesibilidad razonable (WCAG 2.1 AA) verificable con herramientas automáticas de bajo costo (axe, Lighthouse CI) más una revisión manual acotada, sin depender de una auditoría externa para lanzar v1.

**Non-Goals (explícitamente fuera de alcance de v1):**
- Integración con la WhatsApp Business API (se mantiene el enlace `wa.me` con mensaje prellenado).
- Carrito de compra, checkout o pago en línea (el cierre de venta/cotización sigue siendo por WhatsApp).
- Subida o almacenamiento de imágenes de receta óptica (el formulario solo indica si el cliente posee receta; la receta en sí se coordina por un canal directo).
- Adjuntar o almacenar documentos sensibles en las solicitudes de derechos ARCO (mismo principio de minimización de datos que en `quote-requests`).
- Automatización del borrado/anonimización de solicitudes (comerciales o de derechos ARCO) por vencimiento de retención (se documenta el mecanismo, no se implementa el job en v1).
- Validación legal definitiva de los textos de privacidad/ARCO/términos (se usan como borrador marcado como pendiente).
- Alta disponibilidad multi-instancia / balanceo de carga (v1 corre en una sola instancia Lightsail permanente).
- Un ambiente de staging permanente y separado de producción (se define un mecanismo efímero bajo demanda, no una segunda instancia continua).
- Una auditoría de accesibilidad externa/contratada como requisito para el lanzamiento inicial.
- Acoplar la aplicación a un dominio o proveedor DNS específico (la selección definitiva de dominio es un prerrequisito de despliegue, no de esta implementación).
- Internacionalización (la app es en español, moneda CLP, para el mercado chileno únicamente).

## Especificaciones funcionales

El detalle normativo (requisitos + escenarios, formato SHALL/WHEN/THEN) vive en `specs/<capability>/spec.md`, uno por cada capacidad listada en `proposal.md`. Esta sección resume el alcance funcional y remite a cada spec:

| Capacidad | Resumen funcional | Spec |
|---|---|---|
| `public-site` | Páginas informativas (inicio, cristales, nosotros, FAQ, contacto, privacidad, ARCO, términos), navegación global, banner de cookies, configuración de negocio visible en el sitio | `specs/public-site/spec.md` |
| `product-catalog` | Listado de armazones con búsqueda/filtros, ficha de producto, productos relacionados | `specs/product-catalog/spec.md` |
| `product-management` | CRUD administrativo de modelos (datos, colores, fotos, disponibilidad, etiqueta) | `specs/product-management/spec.md` |
| `quote-requests` | Cotizador de 5 pasos, envío de solicitud, notificación por correo, CTA WhatsApp | `specs/quote-requests/spec.md` |
| `home-visit-requests` | Formulario de atención a domicilio validado contra comunas habilitadas, notificación por correo, CTA WhatsApp | `specs/home-visit-requests/spec.md` |
| `request-inbox` | Bandeja administrativa unificada de solicitudes, filtros, cambio de estado, retención | `specs/request-inbox/spec.md` |
| `home-visit-coverage` | Gestión administrativa de comunas habilitadas | `specs/home-visit-coverage/spec.md` |
| `business-settings` | Configuración administrativa de datos de contacto/horario/ubicación/retención | `specs/business-settings/spec.md` |
| `admin-auth` | Autenticación por sesión, usuarios y roles administradores, auditoría | `specs/admin-auth/spec.md` |
| `product-image-storage` | Subida, validación, redimensionado y entrega de imágenes de producto vía Object Storage | `specs/product-image-storage/spec.md` |
| `data-rights-requests` | Solicitudes de derechos ARCO persistidas en PostgreSQL, notificación al negocio, flujo de estados y auditoría | `specs/data-rights-requests/spec.md` |

Todas las capacidades son **nuevas** — no existen specs previas en `openspec/specs/` (proyecto sin versión productiva anterior).

## Especificaciones no funcionales

| Categoría | Requisito |
|---|---|
| **Disponibilidad** | v1 corre en una sola instancia Lightsail; se acepta downtime acotado para mantenimiento/despliegue. Objetivo informal: 99% mensual. Alta disponibilidad multi-instancia queda fuera de alcance (ver Non-Goals). |
| **Rendimiento** | Páginas públicas renderizadas en el servidor (SSR/ISR según corresponda) con Core Web Vitals razonables; imágenes servidas vía `next/image` apuntando a Object Storage; sin JS de terceros bloqueante (se retira la dependencia de Google Fonts CDN). |
| **Seguridad** | Ver sección dedicada "Controles de seguridad" más abajo. |
| **Accesibilidad** | Objetivo WCAG 2.1 nivel AA. Ver sección dedicada "Estrategia de accesibilidad" para el detalle de comprobaciones automáticas (axe, Lighthouse CI) y la lista de validación manual; no se exige auditoría externa para el lanzamiento inicial. |
| **Responsive** | Mobile-first con Tailwind; al menos los dos breakpoints observados en el mockup (~1000px, ~560px), evaluando un breakpoint intermedio de tablet si el diseño lo amerita. |
| **Observabilidad** | Logs estructurados (JSON) en la aplicación y en Nginx; registro de auditoría administrativa persistente en base de datos (no solo logs de archivo). |
| **Cumplimiento de datos personales** | Retención configurable de solicitudes (default 12 meses), consentimiento explícito en formularios (checkbox, igual que el mockup), textos legales marcados como borrador hasta validación. |
| **Portabilidad/backup** | Backups diarios de PostgreSQL vía `pg_dump`, almacenados fuera de la instancia (Lightsail Object Storage); procedimiento de restauración documentado y probado antes del lanzamiento. |
| **Mantenibilidad** | TypeScript estricto, Zod para validación en los límites del sistema (formularios y API), estructura de monolito modular por dominio (ver "Arquitectura de módulos"), CI que exige lint + typecheck + tests + build antes de mergear. |
| **Internacionalización** | Fuera de alcance en v1: solo español (Chile), moneda CLP, sin soporte multi-idioma. |

## Estrategia de accesibilidad

- **Objetivo**: WCAG 2.1 nivel AA en las páginas públicas y en el panel de administración.
- **Comprobaciones automáticas**: `axe` (auditoría de accesibilidad) y **Lighthouse CI** integrados al pipeline de CI (ver Fase 9), corriendo sobre las páginas públicas principales y las pantallas clave del panel admin en cada pull request. Un resultado por debajo del umbral acordado (a definir en la implementación, p. ej. score de accesibilidad de Lighthouse) marca el build como fallido, igual que lint/typecheck/tests/build.
- **Lista de validación manual** (a ejecutar al menos una vez antes del lanzamiento, y ante cambios relevantes de UI): 
  1. **Teclado**: toda acción alcanzable solo con mouse en el mockup (botones, acordeón FAQ, stepper del cotizador, drawers) debe poder operarse con teclado (Tab/Shift+Tab/Enter/Espacio/Escape), sin trampas de foco.
  2. **Foco**: el foco visible en todo momento; al abrir/cerrar un drawer o panel (menú móvil, filtros de catálogo), el foco se mueve y regresa de forma predecible.
  3. **Formularios**: cada campo con su `<label>` asociado, mensajes de error anunciados (no solo indicados por color), campos obligatorios señalizados de forma perceptible sin depender únicamente del color.
  4. **Contraste**: mínimo 4.5:1 en texto normal y 3:1 en texto grande/elementos gráficos, verificado explícitamente en las combinaciones de marca heredadas del mockup (fucsia/rosado sobre blanco).
  5. **Textos alternativos**: `alt` descriptivo en imágenes de producto y logo; iconos puramente decorativos marcados `aria-hidden`; iconos con significado (WhatsApp, menú, cerrar) con `aria-label`.
  6. **Lector de pantalla**: landmarks (`header`/`nav`/`main`/`footer`), jerarquía de encabezados coherente, y que los estados dinámicos (acordeón FAQ abierto/cerrado, paso actual del cotizador, mensajes de error/éxito) se anuncien correctamente.
- **Sin auditoría externa requerida para v1**: el objetivo de esta versión es cumplir lo verificable con axe + Lighthouse CI + la lista manual anterior. Una auditoría de accesibilidad externa/contratada queda fuera de alcance de v1 (ver Non-Goals) y puede incorporarse en una iteración futura si el negocio lo requiere.

## Modelo de datos

Modelo relacional (PostgreSQL vía Prisma) ilustrativo — el `schema.prisma` real se crea en la Fase 1 de implementación, no en esta propuesta. Los nombres de campo son orientativos; el detalle exacto de tipos/constraints se resuelve al implementar cada módulo.

```
Product
  id, code (unique), name, gender (enum), shape (enum), material (enum),
  sizes, priceFromClp (int), description, badge (enum, nullable),
  available (bool), createdAt, updatedAt, createdById -> AdminUser, updatedById -> AdminUser

ProductColor
  id, productId -> Product, name, hex

ProductImage
  id, productId -> Product, slot (enum: MAIN | FRONT | SIDE), storageKey,
  url, width, height, createdAt

Request                         # cotizaciones + atención a domicilio, tabla unificada
  id, type (enum: QUOTE | HOME_VISIT), status (enum: NEW | HANDLED),
  name, phone, email (nullable), comuna (nullable),
  message (nullable), hasPrescription (bool, nullable, solo QUOTE),
  details (json — específico por tipo: armazón/cristal/tratamientos para QUOTE;
           tipo de atención para HOME_VISIT),
  consentAcceptedAt, createdAt, retentionExpiresAt, deletedAt (nullable, soft delete)

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
  id, email (unique), passwordHash, name, role (enum: SUPERADMIN | ADMIN),
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
- **`hasPrescription` como booleano**, sin ningún campo de archivo/adjunto: refleja la decisión aprobada de no almacenar ni subir imágenes de receta en v1.
- **Roles como enum (`SUPERADMIN`/`ADMIN`)** en vez de una tabla de permisos granular: suficiente para "múltiples usuarios y roles" en v1 (un rol que puede gestionar usuarios/configuración sensible vs. uno operativo). Si more adelante se necesitan permisos más finos, migrar a una tabla `Permission`/`RolePermission` es un cambio aditivo, no una reescritura.
- **`Session` persistida en base de datos**, no JWT stateless: permite invalidar sesiones (logout real, expiración forzada, ver "Estrategia de autenticación") y es coherente con "autenticación segura basada en sesiones" del stack objetivo.
- **`retentionExpiresAt` calculado al crear la solicitud** (`createdAt` + `requestRetentionMonths` vigente en `BusinessSettings` al momento del envío) en vez de calculado al vuelo: permite que un cambio futuro en el período de retención no altere retroactivamente solicitudes ya creadas, y deja el campo listo para que un job de limpieza futuro simplemente consulte `retentionExpiresAt < now()`.
- **`EmailLog`** existe para observabilidad y para poder diagnosticar fallas de entrega de correo sin acoplar ese detalle al propio `Request` (ahora también a `DataRightsRequest`).
- **`DataRightsRequest` como tabla separada de `Request`**, no como un tercer `type` dentro de la tabla unificada: tiene un ciclo de vida distinto (4 estados — `RECEIVED`/`IN_REVIEW`/`RESOLVED`/`REJECTED` — en vez de 2), una taxonomía propia (`rightType`, los 6 derechos ARCO) y una motivación distinta (cumplimiento legal, no interés comercial). Mezclarla en `Request` habría forzado esos 4 estados sobre las solicitudes comerciales o un campo de estado polimórfico confuso. Se administra en una sección propia dentro de `/admin/requests` (ver "Arquitectura de módulos"), no en una ruta nueva, para no ampliar el conjunto de rutas de administración ya aprobado.
- **`DataRightsRequest` aplica minimización de datos deliberada**: solo captura nombre, correo, teléfono opcional y descripción — sin RUT ni ningún campo de verificación de identidad, y sin adjuntos. Esto difiere del formulario ARCO de la maqueta, que sí pedía RUT para verificar identidad; ver "Riesgos y decisiones pendientes" sobre esta tensión entre minimización de datos y verificación de identidad antes de resolver una solicitud real.
- **`retentionExpiresAt` en `DataRightsRequest`** sigue el mismo patrón que en `Request`: se calcula al crear la solicitud a partir de `dataRightsRetentionMonths` (campo propio en `BusinessSettings`, separado de `requestRetentionMonths`, porque el período de retención legalmente adecuado para una solicitud de derechos ARCO no tiene por qué coincidir con el de una solicitud comercial).

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
    notifications/            # estrategia de correo (plantillas + envío)
    storage/                  # product-image-storage (cliente Object Storage, validación, resize)
    shared/                   # cliente Prisma, logger, helpers Zod, tipos comunes
  components/                 # UI compartida derivada del sistema visual del mockup
```

Cada módulo bajo `modules/` expone: **schemas** (Zod, para validar en los límites del sistema), **repository** (acceso a datos vía Prisma) y **service** (reglas de negocio). Las rutas en `app/` son deliberadamente delgadas: parsean entrada, llaman al service del módulo correspondiente, y renderizan. Esto mantiene el monolito modular (un único deploy, límites internos claros) sin necesidad de separar en servicios independientes — consistente con la arquitectura objetivo de `CLAUDE.md`.

**Nota sobre `/admin/requests` y derechos ARCO**: en vez de introducir una ruta nueva (el conjunto de rutas de administración ya fue aprobado como cerrado: `/admin`, `/admin/products`, `/admin/requests`, `/admin/home-visits`, `/admin/settings`, `/admin/users`), las solicitudes de derechos ARCO se muestran como una tercera pestaña/sección dentro de `/admin/requests`, con su propio flujo de 4 estados (`RECEIVED`/`IN_REVIEW`/`RESOLVED`/`REJECTED`), claramente diferenciada de la pestaña de solicitudes comerciales (2 estados: nueva/atendida), para no confundir ambos flujos dentro de la misma pantalla.

## Estrategia de autenticación y autorización

- **Sesión, no JWT stateless**: al iniciar sesión se crea una fila en `Session` (token aleatorio de alta entropía, solo su hash se persiste) y se entrega al navegador como cookie `httpOnly`, `secure`, `sameSite=lax`. Cada request valida la sesión contra la base de datos, lo que permite invalidarla (logout, expiración forzada, bloqueo de usuario) de inmediato.
- **Hash de contraseña**: `argon2id` (o `bcrypt` como alternativa aceptable) — nunca contraseñas ni hashes reversibles; se reemplaza por completo el patrón de la maqueta (usuario/clave hardcodeados en JS del cliente).
- **Roles**: `SUPERADMIN` (puede gestionar `/admin/users` y `/admin/settings`) y `ADMIN` (puede operar `/admin/products`, `/admin/requests`, `/admin/home-visits`, pero no gestionar usuarios). El primer usuario creado en la Fase 5 es `SUPERADMIN`.
- **Protección de rutas**: middleware/guard a nivel de `app/admin/**` que exige sesión válida y rol suficiente antes de renderizar o ejecutar cualquier acción; toda mutación (crear/editar/eliminar producto, cambiar estado de solicitud, editar configuración, gestionar usuarios) se re-valida server-side (nunca confiar en el estado del cliente, a diferencia del mockup).
- **Auditoría**: cada acción administrativa sensible (login, logout, crear/editar/eliminar producto, cambiar estado o eliminar solicitud, editar configuración de negocio, editar comunas habilitadas, crear/editar/desactivar usuario) escribe una fila en `AuditLogEntry` con actor, acción, entidad afectada e IP. El registro de auditoría es de solo-inserción (append-only) desde la aplicación — no se expone ninguna acción de edición/borrado sobre él en la UI.
- **Contra fuerza bruta**: límite de intentos de login por IP/usuario en una ventana de tiempo (ver "Controles de seguridad").

## Estrategia de almacenamiento de imágenes

- **Destino**: AWS Lightsail Object Storage (API compatible S3), un bucket dedicado a imágenes de producto — nunca el sistema de archivos del contenedor de la aplicación (regla permanente de `CLAUDE.md`).
- **Flujo de subida**: el navegador sube el archivo a una ruta del servidor (no al bucket directamente en v1, para poder validar/redimensionar antes de persistir) → el servidor valida tipo MIME y tamaño máximo → redimensiona/optimiza con una librería server-side (reemplazando el resize por `<canvas>` del navegador que hace el mockup) → sube el resultado al bucket → guarda `storageKey` + URL pública en `ProductImage`.
- **Acceso**: imágenes de producto se sirven como contenido público de solo lectura (no son datos sensibles); el bucket no otorga permisos de escritura pública — solo la aplicación (vía credenciales de servicio) puede escribir.
- **Optimización de entrega**: `next/image` (u otro pipeline de optimización) sirviendo desde el dominio del bucket/CDN, en vez de imágenes base64 embebidas como hace el mockup.
- **Backups**: el bucket de imágenes es en sí mismo la fuente de verdad (no vive en Postgres), así que el backup de imágenes es la durabilidad propia de Object Storage; el backup de `pg_dump` solo necesita las referencias (`storageKey`/URL), no los binarios.
- **Reemplaza directamente** el patrón identificado en `docs/functional-gaps.md` sección 2 (imágenes base64 dentro de `localStorage`, sin límite de tamaño real, sin optimización real).

## Estrategia de correo

- **Proveedor**: AWS SES, por afinidad con el resto de la infraestructura en AWS/Lightsail y costo marginal bajo a la escala esperada. *(Decisión inicial — ver "Riesgos y decisiones pendientes" para el paso de verificación de dominio/salida de sandbox que debe completarse antes del lanzamiento).*
- **Disparadores**: al enviar una `Request` (cotización o atención a domicilio) válida, se envían dos correos:
  1. **Confirmación al cliente** (si dejó correo — es opcional en el formulario de cotización, ver `specs/quote-requests/spec.md`): agradecimiento + resumen de lo solicitado + recordatorio de que pueden continuar por WhatsApp.
  2. **Notificación al negocio**: a la dirección configurada en `business-settings`, con el detalle completo de la solicitud, para que el equipo pueda dar seguimiento aunque el cliente no reenvíe el WhatsApp.
- **Derechos ARCO**: al crearse una `DataRightsRequest`, el sistema envía una notificación por correo al negocio (dirección configurada en `business-settings`) con el detalle de la solicitud (tipo de derecho, datos de contacto, descripción). En v1 no se envía confirmación al cliente para este flujo (no fue parte de las decisiones aprobadas); solo queda la confirmación visible en pantalla al momento del envío, definida en `specs/public-site/spec.md`.
- **No bloqueante**: el envío de correo ocurre después de persistir la `Request`/`DataRightsRequest` (la solicitud nunca se pierde si el correo falla); cada intento se registra en `EmailLog` con su resultado, para poder diagnosticar fallas de entrega sin depender de los logs de la infraestructura de correo.
- **Reintentos**: v1 no implementa una cola de reintentos automáticos (sin infraestructura de colas en el monolito); un fallo queda registrado en `EmailLog` como `FAILED` y es visible para el negocio en el propio panel (se decide en la Fase 4 si se expone directamente en `/admin/requests` o solo en logs).
- **Plantillas**: HTML simple con el sistema visual de la marca (colores/tipografía self-hosted), sin dependencias de servicios de plantillas externos.

## Controles de seguridad

- **HTTPS obligatorio** de extremo a extremo: Nginx termina TLS (certificado gestionado, p. ej. Let's Encrypt/Certbot) y redirige todo tráfico HTTP a HTTPS; cookies de sesión marcadas `secure`.
- **PostgreSQL nunca expuesto públicamente**: corre en la red interna de Docker Compose, sin publicar el puerto 5432 al firewall de Lightsail; solo el contenedor de la aplicación puede alcanzarlo.
- **Secretos fuera de Git**: variables de entorno (`.env`, ya ignorado) para credenciales de base de datos, credenciales de Object Storage, credenciales SES, secreto de firma de sesión; en Lightsail se gestionan como variables de entorno del despliegue, nunca committeadas.
- **Validación en los límites del sistema**: todo input de formularios públicos y del panel admin se valida con Zod tanto en cliente (UX) como en servidor (autoridad real) — reemplaza las validaciones triviales y bypasseables del mockup.
- **Rate limiting**: límite de intentos en el login de administración y en los formularios públicos (cotizador, domicilio, ARCO) por IP/ventana de tiempo, para mitigar fuerza bruta y spam — implementación en memoria de la propia instancia es suficiente para v1 (una sola instancia; no se introduce Redis en esta versión, ver "Riesgos").
- **Cabeceras de seguridad**: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, configuradas en Nginx o en el propio Next.js.
- **CSRF**: mitigado por cookies `sameSite=lax` + verificación de origen en mutaciones del panel admin (server actions/route handlers).
- **Principio de mínimo privilegio**: el usuario de base de datos que usa la aplicación tiene solo los permisos necesarios sobre su propio esquema (no superusuario de Postgres).
- **Dependencias**: `npm audit`/Dependabot (o equivalente) como parte de CI para detectar vulnerabilidades conocidas.
- **Auditoría administrativa** (detallada en la sección de autenticación) como control de trazabilidad, no solo de negocio.

## Ambientes

| Ambiente | Naturaleza | Propósito |
|---|---|---|
| **Desarrollo local** | Docker Compose de desarrollo (hot reload) | Trabajo diario de cada desarrollador; base de datos local efímera, datos de seed del mockup (`SEED`). |
| **Validación local con build productivo** | La misma imagen Docker y el mismo `docker-compose.yml` que se usan en producción, levantados localmente antes de desplegar | Detectar diferencias entre "funciona en dev" y "funciona con el build/artefacto real" antes de tocar producción — no reemplaza al CI, es una verificación adicional previa al despliegue. |
| **Producción** | Una única instancia Lightsail **permanente** | Sirve el sitio y el panel admin reales; único ambiente con datos reales de negocio. |
| **Staging** | **No permanente** — se levanta bajo demanda (misma imagen/compose que producción, en una instancia o entorno temporal) y se destruye al terminar | Reservado para cambios de **alto riesgo** (migraciones de base de datos, cambios de autenticación/autorización, cambios de infraestructura) donde validar en un entorno aislado antes de tocar producción. No se mantiene corriendo permanentemente para no duplicar el costo/mantenimiento de una segunda instancia. |

**Aprobación manual de despliegue a producción**: el workflow de GitHub Actions que despliega a la instancia Lightsail productiva requiere una aprobación manual explícita (p. ej. un "environment" de GitHub con reviewers requeridos) antes de ejecutarse — el pipeline puede construir, testear y preparar el despliegue automáticamente, pero no lo aplica a producción sin esa aprobación.

## Infraestructura objetivo en Lightsail

- **Instancia Lightsail** (una sola permanente para producción, más una instancia/entorno de staging efímero cuando se necesite — ver "Ambientes"): ejecuta Docker Compose con, como mínimo, tres servicios:
  - `app`: contenedor Next.js (build de producción).
  - `db`: contenedor PostgreSQL, **sin puerto publicado al exterior**, solo en la red interna de Compose.
  - `nginx`: reverse proxy, termina TLS, sirve como único punto de entrada público (puertos 80/443).
- **AWS Lightsail Object Storage**: un bucket para imágenes de producto y un bucket (o prefijo separado) para los backups de `pg_dump`.
- **Dominio y URL configurables por variable de entorno**: la aplicación lee el dominio/URL vigente exclusivamente de `APP_URL` (uso server-side) y `NEXT_PUBLIC_APP_URL` (uso client-side/enlaces absolutos), sin ningún dominio ni proveedor DNS hardcodeado en el código. La selección definitiva de dominio y proveedor DNS es un **prerrequisito del despliegue** (se resuelve al desplegar, apuntando esas variables al dominio elegido), no un bloqueo para implementar o probar la aplicación.
- **Despliegue**: GitHub Actions construye la imagen de la app, corre lint/typecheck/tests/build (gate obligatorio antes de desplegar, por regla de `CLAUDE.md`), y despliega a la instancia productiva solo tras la aprobación manual descrita en "Ambientes" (p. ej. vía SSH + `docker compose pull && up -d`, o publicando la imagen a un registro y actualizando el compose remoto).
- **Firewall de Lightsail**: solo 22 (SSH, restringido), 80 y 443 abiertos; ningún otro puerto (en particular, no 5432) expuesto.
- **Variables de entorno/secretos**: gestionados en el propio host de despliegue (o como secretos de GitHub Actions inyectados en el deploy), nunca en el repositorio.

## Procedimiento de backup y restauración

- **Backup diario**: job programado (cron dentro del contenedor `db` o en el host) que ejecuta `pg_dump` y sube el archivo comprimido resultante al bucket de Object Storage dedicado a backups, con un nombre que incluya fecha.
- **Retención de backups**: se conservan los backups diarios de, al menos, los últimos 14 días (a definir el detalle exacto de política de rotación en la Fase 10 — ver "Riesgos y decisiones pendientes").
- **Restauración**: procedimiento documentado (runbook) para: (1) descargar el dump más reciente del bucket, (2) levantar/recuperar el contenedor `db`, (3) restaurar con `pg_restore`/`psql` sobre una base vacía, (4) verificar integridad mínima (conteo de filas de tablas clave, login de administrador funcional).
- **Prueba de restauración**: se debe ejecutar al menos una restauración de prueba completa (en un entorno aparte de producción) antes del lanzamiento, como parte de los criterios de aceptación de la Fase 10.
- **Imágenes de producto**: no requieren backup vía `pg_dump` (no viven en Postgres); su durabilidad depende de Object Storage. Se documenta explícitamente que un backup de base de datos sin las imágenes del bucket es un backup parcial (las referencias `storageKey` quedarían apuntando a objetos que sí siguen existiendo en el bucket, dado que son servicios independientes).

## Plan de pruebas

- **Unitarias**: schemas Zod (validación de formularios y de payloads de API) y lógica de negocio pura de cada `service` de módulo (p. ej. cálculo de `retentionExpiresAt`, filtrado de catálogo, reglas de disponibilidad de comuna).
- **Integración**: repositorios Prisma y route handlers/server actions contra una base de datos de pruebas (contenedor Postgres efímero), cubriendo al menos: creación/edición/borrado de producto, envío de cotización y de consulta de domicilio (incluye verificación de que se registra el intento de envío de correo en `EmailLog`), login/logout de admin, cambio de estado de una solicitud, gestión de comunas habilitadas.
- **End-to-end** (Playwright u equivalente): flujos críticos completos —
  - Visitante navega catálogo, filtra, entra a una ficha, inicia el cotizador y completa los 5 pasos hasta ver la pantalla de éxito.
  - Visitante envía una consulta de atención a domicilio para una comuna habilitada y para una no habilitada (debe rechazarse/advertir).
  - Administrador inicia sesión, crea un producto con fotos, lo edita, lo elimina.
  - Administrador revisa la bandeja de solicitudes, cambia el estado de una a "atendida".
  - Administrador gestiona la lista de comunas habilitadas.
  - Administrador (rol `SUPERADMIN`) crea un segundo usuario administrador; un usuario `ADMIN` intenta acceder a `/admin/users` y es rechazado.
  - Visitante envía una solicitud de derechos ARCO; un administrador la ve en `/admin/requests` (sección Derechos ARCO), la mueve a "en revisión" y luego a "resuelta" con una nota de resolución.
- **Accesibilidad**: `axe` y **Lighthouse CI** integrados al pipeline de CI (ver "Estrategia de accesibilidad" y Fase 9), corriendo sobre las páginas públicas principales y las pantallas clave del panel admin en cada pull request; complementado con la lista de validación manual (teclado, foco, formularios, contraste, textos alternativos, lector de pantalla) antes del lanzamiento y ante cambios relevantes de UI. No se exige auditoría externa para v1.
- **Validación local con build productivo**: antes de cada despliegue a producción, se levanta localmente la misma imagen Docker y el mismo `docker-compose.yml` productivos (ver "Ambientes") como una verificación adicional de humo, distinta del entorno de desarrollo.
- **Gate de CI**: lint + typecheck + tests + build (incluyendo las comprobaciones de accesibilidad) deben pasar antes de mergear a la rama principal; el despliegue a producción además requiere la aprobación manual descrita en "Ambientes" (regla permanente de `CLAUDE.md` + decisión de esta actualización).

## Criterios de aceptación

Para considerar completa la v1 descrita en esta propuesta:

1. Todas las vistas públicas del mockup (`docs/page-inventory.md`) existen como rutas reales de Next.js con el mismo contenido/flujo, sirviendo datos desde PostgreSQL (no datos hardcodeados en el bundle de la app, salvo contenido puramente editorial que no cambia — p. ej. la explicación de tipos de cristal).
2. El catálogo, las solicitudes, la configuración de negocio, las comunas habilitadas y los usuarios administradores persisten en PostgreSQL y sobreviven a un reinicio completo del stack (sin `localStorage` de por medio para nada de esto).
3. El login de administrador exige credenciales reales contra la base de datos, con contraseña hasheada y sesión invalidable; no existen credenciales hardcodeadas en el código ni visibles en la UI.
4. Las imágenes de producto se sirven desde Lightsail Object Storage; ninguna imagen de producto se almacena en base64 dentro de la base de datos ni en el sistema de archivos del contenedor de la app.
5. Al enviar una cotización o una consulta de domicilio válida, se registra en `EmailLog` un intento de correo al cliente (si dejó correo) y uno al negocio, además de mostrarse el CTA de continuar por WhatsApp.
6. La lista de comunas habilitadas es editable desde `/admin/home-visits` y el formulario público de atención a domicilio la respeta.
7. Existe al menos un usuario `SUPERADMIN` capaz de crear otros usuarios administradores con rol `ADMIN`; un usuario `ADMIN` no puede acceder a `/admin/users`.
8. Toda acción administrativa sensible queda registrada en `AuditLogEntry` con actor, acción y timestamp.
9. La aplicación solo es alcanzable por HTTPS; PostgreSQL no es alcanzable desde fuera de la red interna de Docker Compose (verificable con un escaneo de puertos externo a la instancia Lightsail).
10. Existe al menos un backup diario verificado y una restauración de prueba documentada y ejecutada con éxito antes del lanzamiento.
11. CI ejecuta y aprueba lint, typecheck, tests y build antes de cada despliegue.
12. Las páginas de privacidad, términos y el propio formulario ARCO (en cuanto a su contenido explicativo) muestran visiblemente que el texto legal es un borrador pendiente de validación legal, hasta que se reciba y aplique esa validación.
13. Las comprobaciones automáticas de accesibilidad (`axe` y Lighthouse CI) corren en CI sobre las páginas públicas principales y el panel admin, y la lista de validación manual de accesibilidad (teclado, foco, formularios, contraste, textos alternativos, lector de pantalla) se ejecuta y documenta al menos una vez antes del lanzamiento; no se exige ni se bloquea el lanzamiento por una auditoría externa.
14. El dominio/URL de la aplicación se resuelve exclusivamente a partir de `APP_URL`/`NEXT_PUBLIC_APP_URL`; no existe ningún dominio ni proveedor DNS hardcodeado en el código.
15. Existe un flujo de validación local con la imagen y configuración productivas previo a cada despliegue, y el workflow de GitHub Actions que despliega a producción exige una aprobación manual explícita antes de aplicarse.
16. Las solicitudes de derechos ARCO persisten en PostgreSQL (`DataRightsRequest`), son visibles y gestionables en `/admin/requests` (sección Derechos ARCO) con su flujo de estados `RECEIVED → IN_REVIEW → RESOLVED/REJECTED`, generan una notificación por correo al negocio, cada cambio de estado queda registrado en `AuditLogEntry`, y no se adjunta ni almacena ningún documento sensible en ellas.

## Riesgos / Trade-offs

| Riesgo | Mitigación |
|---|---|
| Instancia Lightsail única = punto único de falla | Backups diarios + runbook de restauración probado; evaluar escalar verticalmente o replicar si el negocio crece antes de invertir en alta disponibilidad. |
| AWS SES en modo sandbox no permite enviar a direcciones no verificadas | Solicitar salida de sandbox / verificación de dominio en la Fase 1-4, antes de que la Fase 10 dependa de correo funcionando en producción. |
| Rate limiting en memoria (sin Redis) se resetea al reiniciar la app y no comparte estado si algún día hay más de una instancia | Aceptable para v1 (una sola instancia); documentado como upgrade path si el tráfico o el número de instancias crece. |
| Contenido legal (privacidad/ARCO/términos) reutilizado del mockup sin validar | Marcado explícitamente como borrador en la UI hasta recibir validación legal; no bloquea el desarrollo, sí debería bloquear un lanzamiento "real" ante clientes hasta resolverse. |
| Tentación de reintroducir el patrón de imágenes base64 (más simple de implementar) durante el desarrollo | Enforced como no-goal explícito en este documento y en `product-image-storage`; revisar en code review. |
| `details` JSON en `Request` pierde algo de la seguridad de tipos de un esquema totalmente relacional | Mitigado con un schema Zod estricto por `type` que valida el contenido de `details` en cada punto de entrada/salida. |
| Retención configurable sin job de limpieza automático puede acumular datos indefinidamente si nadie construye el job futuro | Documentado explícitamente como trabajo pendiente (ver "Riesgos y decisiones pendientes" abajo) con el campo `retentionExpiresAt` ya listo para que ese job solo tenga que consultarlo. |
| Un solo administrador inicial (`SUPERADMIN`) es también punto único de falla operativa (¿qué pasa si pierde acceso?) | El modelo de roles permite crear un segundo `SUPERADMIN` en cualquier momento; se recomienda hacerlo antes de considerar el lanzamiento completo. |
| `DataRightsRequest` no incluye verificación de identidad (p. ej. RUT), a diferencia del formulario ARCO de la maqueta | Decisión deliberada de minimización de datos; validar con negocio/legal si se requiere verificación de identidad antes de resolver una solicitud real, y agregar el campo en una iteración futura si es necesario (ver "Riesgos y decisiones pendientes"). |
| Mezclar solicitudes comerciales (2 estados) y de derechos ARCO (4 estados) dentro de la misma ruta `/admin/requests` puede confundir a los administradores | Sección/tab claramente diferenciada ("Derechos ARCO") con su propio flujo de estados, en vez de una lista única mezclada. |
| Un ambiente de staging efímero sin un criterio claro de "cuándo levantarlo" puede no usarse cuando realmente se necesita | Documentar como criterio explícito los cambios que lo disparan (migraciones de datos, cambios de autenticación/autorización, cambios de infraestructura) como parte de la Fase 9/10. |
| Ejecutar comprobaciones de accesibilidad (axe/Lighthouse CI) sin un umbral numérico acordado puede volverse un gate ignorable o, al revés, bloquear builds por regresiones menores | Definir el umbral concreto (score mínimo, cero violaciones críticas de axe) al implementar el pipeline en la Fase 9, no dejarlo implícito. |

## Riesgos y decisiones pendientes

**Decisiones cerradas en esta actualización** (antes figuraban aquí como abiertas; se documentan ahora como decisión en las secciones indicadas, no se repiten en detalle en esta lista):
- Alcance de accesibilidad para v1 → ver "Estrategia de accesibilidad".
- Manejo de dominio y DNS → ver "Infraestructura objetivo en Lightsail" (variables `APP_URL`/`NEXT_PUBLIC_APP_URL`, selección de dominio como prerrequisito de despliegue).
- Modelo de ambientes (desarrollo, validación local con build productivo, producción permanente, staging efímero, aprobación manual de despliegue) → ver "Ambientes".
- Persistencia real de solicitudes de derechos ARCO → ver capacidad `data-rights-requests` y su spec.

Preguntas que esta propuesta deja explícitamente abiertas (no bloquean el inicio de la Fase 1, pero deben resolverse antes de las fases que dependen de ellas):

1. **Proveedor de correo final**: se propone AWS SES; confirmar que la cuenta AWS puede salir de modo sandbox y verificar el dominio de envío antes de que la Fase 4 dependa de correo real en producción.
2. **Tamaño/plan exacto de la instancia Lightsail** y del bucket de Object Storage: a dimensionar según tráfico esperado real, no definido en esta propuesta.
3. **Política de rotación de backups** más allá de "al menos 14 días": definir si se agregan snapshots semanales/mensuales de mayor retención.
4. **Mecanismo futuro de borrado/anonimización por retención**: esta propuesta documenta el campo `retentionExpiresAt` (en `Request` y en `DataRightsRequest`) y la configuración de ambos períodos, pero el job que efectivamente borra/anonimiza datos vencidos **no se construye en v1** — queda como trabajo futuro explícito.
5. **Validación legal de privacidad/ARCO/términos**: pendiente de un responsable legal/del negocio; hasta entonces el contenido se marca como borrador en la propia UI.
6. **Verificación de identidad en solicitudes de derechos ARCO**: `DataRightsRequest` no incluye RUT ni ningún otro campo de verificación de identidad, a diferencia del formulario ARCO de la maqueta (que sí lo pedía). Es una decisión deliberada de minimización de datos para v1, pero queda pendiente confirmar con el negocio/un responsable legal si la normativa exige verificar identidad antes de resolver una solicitud real — de ser así, se agregaría como campo adicional en una iteración futura, no bloquea esta propuesta.
7. **Umbral de accesibilidad en CI**: se decide usar axe + Lighthouse CI (ver "Estrategia de accesibilidad"), pero el umbral numérico exacto que hace fallar el build queda para definirse durante la implementación (Fase 9).
8. **Criterio de activación del staging efímero**: se decide que existe y es no permanente (ver "Ambientes"), pero el listado exhaustivo de qué cambios lo ameritan se termina de precisar en las Fases 9-10.

## Migration Plan

No aplica una migración desde un sistema productivo previo (no existe ninguno). El "rollout" es la secuencia de fases descrita en `tasks.md` (Fundación técnica → Sitio público → Catálogo y productos → Formularios y solicitudes → Autenticación y administración → Almacenamiento de imágenes → Seguridad y auditoría → Docker y Nginx → CI/CD → Despliegue en Lightsail). El contenido inicial del catálogo puede poblarse a partir de los 10 modelos de ejemplo (`SEED`) de `design-reference/` como datos de arranque/demo, a reemplazar por el catálogo real del negocio antes de un lanzamiento con clientes reales — decisión de producto, no técnica, y no bloquea esta propuesta.

## Open Questions

Ver "Riesgos y decisiones pendientes" arriba — se consolidan ahí en vez de duplicarse en esta sección para evitar inconsistencias entre ambas listas.
