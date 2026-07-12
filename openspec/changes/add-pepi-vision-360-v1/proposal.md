## Why

Pepi Visión 360 hoy solo existe como una maqueta de diseño (`design-reference/`): una simulación de una sola página, sin backend, con "persistencia" en `localStorage` del navegador, autenticación de administrador hardcodeada, y ninguna integración real (correo, storage de imágenes, notificaciones). El negocio necesita una primera versión productiva real — sitio público + panel de administración — que reemplace esa maqueta con una aplicación con base de datos, autenticación real, almacenamiento de imágenes fuera del contenedor y notificaciones reales, desplegable en infraestructura propia (AWS Lightsail), manteniendo el mismo contenido, flujos y estilo visual ya validados en el diseño.

## What Changes

- Construir el **sitio público** de Pepi Visión 360 (Next.js App Router) replicando el contenido y los flujos de `design-reference/`: inicio, catálogo de armazones con filtros/búsqueda, ficha de producto, tipos de cristales, cotizador de lentes (5 pasos), atención a domicilio, nosotros, FAQ, contacto, y las páginas legales (política de privacidad, derechos ARCO, términos y condiciones) — estas últimas marcadas explícitamente como **borrador pendiente de validación legal**.
- Reemplazar toda la "persistencia" en `localStorage` de la maqueta por un backend real: PostgreSQL + Prisma, con modelos para productos, solicitudes (cotizaciones y atención a domicilio), comunas habilitadas, configuración del negocio, usuarios administradores y registro de auditoría.
- Construir un **panel de administración real** con autenticación basada en sesiones, en rutas separadas (`/admin`, `/admin/products`, `/admin/requests`, `/admin/home-visits`, `/admin/settings`, `/admin/users`), reemplazando el login hardcodeado (`admin`/`pepi360`) de la maqueta.
- Introducir **gestión de usuarios y roles administradores** desde el día uno (aunque se cree un único usuario admin inicial), reemplazando el flag booleano `pv360_admin` de la maqueta.
- Introducir **notificaciones reales** (correo al cliente + correo al negocio) cuando se recibe una cotización o una consulta de atención a domicilio, manteniendo además el CTA "Continuar por WhatsApp" mediante enlaces `wa.me` con mensaje prellenado (sin integrar la WhatsApp Business API en esta versión).
- Introducir **almacenamiento real de imágenes de producto** fuera del contenedor de la aplicación (AWS Lightsail Object Storage), reemplazando el patrón actual de fotos codificadas en base64 dentro de `localStorage`.
- Introducir una **lista configurable de comunas habilitadas** para atención a domicilio, administrable desde `/admin/home-visits`, reemplazando el campo de comuna en texto libre sin validar de la maqueta.
- Definir una **política de retención de solicitudes** (12 meses por defecto, configurable) y documentar el mecanismo futuro de eliminación/anonimización (no se implementa el job automático en esta versión, pero el modelo de datos lo soporta).
- Reemplazar el formulario de derechos ARCO de la maqueta (que hoy solo muestra una confirmación en pantalla sin persistir nada) por una **capacidad real de gestión de solicitudes de derechos ARCO** (`data-rights-requests`): persistencia en PostgreSQL, notificación por correo al negocio, visibilidad en el panel administrativo, flujo de estados (`RECEIVED` → `IN_REVIEW` → `RESOLVED`/`REJECTED`) con notas de resolución, y registro de cada cambio de estado en el log de auditoría.
- **No** se incorpora carrito, checkout ni pago en línea — las ventas y cotizaciones se siguen cerrando por WhatsApp, tal como en la maqueta.
- **No** se almacenan ni suben imágenes de receta óptica en esta versión — el formulario de cotización solo registra si el cliente indica que posee receta; la coordinación de la receta en sí continúa por un canal directo. Tampoco se adjuntan ni almacenan documentos sensibles en las solicitudes de derechos ARCO.
- Alojar las tipografías (Poppins, Inter) dentro de la propia aplicación, eliminando la dependencia de Google Fonts CDN presente en la maqueta.
- Mantener el dominio/URL de la aplicación configurable mediante las variables de entorno `APP_URL` y `NEXT_PUBLIC_APP_URL`, sin acoplar el código a un dominio o proveedor DNS específico; la selección definitiva de dominio y DNS queda como prerrequisito del despliegue, no de la implementación.
- Definir el modelo de ambientes: desarrollo local vía Docker Compose, una validación local previa al despliegue usando la imagen y configuración productivas, una única instancia Lightsail permanente para producción, y un ambiente de staging **no permanente** que puede levantarse temporalmente para cambios de alto riesgo; el despliegue a producción desde GitHub Actions requiere aprobación manual.
- Fijar el objetivo de accesibilidad en WCAG 2.1 nivel AA, verificado mediante comprobaciones automáticas (axe y Lighthouse CI) más una lista de validación manual (teclado, foco, formularios, contraste, textos alternativos, lector de pantalla); no se exige una auditoría de accesibilidad externa para el lanzamiento inicial.
- Empaquetar y desplegar la aplicación con Docker Compose + Nginx (reverse proxy, HTTPS obligatorio) en AWS Lightsail, con CI/CD vía GitHub Actions y backups diarios de PostgreSQL vía `pg_dump`.

**BREAKING**: no aplica — no existe ninguna versión productiva previa que romper; esta propuesta reemplaza por completo el prototipo de `design-reference/`, que permanece intacto como referencia de solo lectura y no como código a migrar.

## Capabilities

### New Capabilities

- `public-site`: páginas públicas informativas del sitio (inicio, tipos de cristales, nosotros, FAQ, contacto, y las páginas legales de privacidad/ARCO/términos), navegación global (header, footer, banner de cookies, botón flotante de WhatsApp) y configuración de negocio que alimenta esos contenidos.
- `product-catalog`: catálogo público de armazones (listado, búsqueda, filtros por género/forma/material/color/precio/disponibilidad) y ficha de detalle de producto, incluyendo productos relacionados.
- `product-management`: gestión administrativa del catálogo (alta/edición/baja de modelos, colores, fotos, disponibilidad, etiquetas) desde `/admin/products`.
- `quote-requests`: flujo público del cotizador de lentes (5 pasos: armazón, cristal, tratamientos, indicación de receta, datos de contacto), envío de la solicitud, notificación por correo al cliente y al negocio, y CTA de continuidad por WhatsApp.
- `home-visit-requests`: flujo público de consulta de atención a domicilio (validado contra la lista de comunas habilitadas), envío de la solicitud, notificación por correo al cliente y al negocio, y CTA de WhatsApp.
- `request-inbox`: bandeja administrativa unificada de solicitudes (cotizaciones + atención a domicilio) en `/admin/requests`, con filtro por tipo, cambio de estado (nueva/atendida), eliminación, y aplicación de la política de retención configurable.
- `home-visit-coverage`: gestión administrativa de la lista de comunas habilitadas para atención a domicilio, en `/admin/home-visits`.
- `business-settings`: configuración administrativa de los datos del negocio (WhatsApp, teléfono visible, correo, Instagram, horario, ubicación, período de retención de solicitudes) en `/admin/settings`.
- `admin-auth`: autenticación basada en sesiones para el panel de administración, con modelo de usuarios y roles administradores (soporte multiusuario desde el diseño, aunque v1 solo crea un usuario), gestión de usuarios en `/admin/users`, y registro de auditoría de acciones administrativas.
- `product-image-storage`: subida, validación, almacenamiento y entrega de imágenes de producto usando almacenamiento externo (Lightsail Object Storage), fuera del contenedor de la aplicación.
- `data-rights-requests`: gestión real de solicitudes de derechos ARCO — persistencia en PostgreSQL, notificación por correo al negocio, visibilidad y flujo de estados en el panel administrativo, y registro de auditoría por cada cambio de estado.

### Modified Capabilities

_Ninguna — no existen specs previas en `openspec/specs/`; este es el primer conjunto de capacidades del proyecto._

## Impact

- **Código nuevo**: aplicación Next.js completa (App Router) — no existe código de aplicación previo, solo la maqueta de referencia en `design-reference/` (no se modifica) y este árbol de documentación/planificación.
- **Base de datos**: nuevo esquema PostgreSQL (vía Prisma) para productos, solicitudes comerciales, solicitudes de derechos ARCO, comunas habilitadas, configuración de negocio, usuarios administradores, sesiones y auditoría.
- **Infraestructura**: nuevo despliegue en AWS Lightsail (instancia permanente + Object Storage), Docker Compose, Nginx, GitHub Actions con aprobación manual para desplegar a producción, y la posibilidad de levantar un ambiente de staging efímero para cambios de alto riesgo. No existe infraestructura previa que migrar. El dominio/DNS definitivo se resuelve como prerrequisito de despliegue (la app solo depende de `APP_URL`/`NEXT_PUBLIC_APP_URL`).
- **Dependencias externas**: proveedor de correo transaccional (a definir en `design.md`), Lightsail Object Storage, WhatsApp (solo como enlace `wa.me`, sin API).
- **Contenido legal**: los textos de privacidad/ARCO/términos de la maqueta se reutilizan como borrador, marcados en la propia UI y en `design.md` como pendientes de validación legal antes de un despliegue productivo real con usuarios finales.
- **Accesibilidad**: se incorpora axe y Lighthouse CI como comprobaciones automáticas en CI, más una lista de validación manual documentada en `design.md`; no se exige auditoría externa para el lanzamiento inicial.
- **Fuera de alcance de esta propuesta**: WhatsApp Business API, carrito/checkout/pago en línea, subida de imágenes de receta óptica, subida de documentos adjuntos en solicitudes de derechos ARCO, automatización real de borrado/anonimización por retención (solo se documenta el mecanismo futuro), auditoría de accesibilidad externa, ambiente de staging permanente.
