## 1. Entorno local Docker Compose

Esta fase es la **base obligatoria de todo el desarrollo posterior**: se construye antes que cualquier código de aplicación, y ninguna fase siguiente asume ni requiere herramientas instaladas directamente en el host más allá de Docker y Docker Compose. Ningún paso de esta fase crea, aprovisiona ni configura recursos en AWS, ni usa AWS CLI, Terraform, CloudFormation, CDK, Pulumi, Ansible o LocalStack.

**Regla obligatoria para todas las fases posteriores (2 a 9):**
- No se ejecuta `npm`, Prisma, tests, build ni ninguna herramienta de la aplicación directamente en el host.
- Todo comando de la aplicación se ejecuta dentro de los contenedores mediante `docker compose exec <servicio> <comando>` (contenedor ya corriendo) o `docker compose run --rm <servicio> <comando>` (ejecución puntual).
- El host solamente requiere tener instalados Docker y Docker Compose.
- No se utiliza una instalación local de PostgreSQL, MinIO, Nginx ni Mailpit: los cuatro corren exclusivamente como contenedores de este `compose.yaml`.

Tareas:

- [x] 1.1 Escribir `Dockerfile.dev` para el servicio `web` (Next.js, TypeScript estricto), preparado para hot reload con el código fuente montado por volumen.
- [x] 1.2 Escribir `.dockerignore` (excluyendo `node_modules`, `.git`, `.next`, `.env`, etc.) para mantener el contexto de build de `web` liviano y sin filtrar archivos locales/secretos.
- [x] 1.3 Crear un `package.json`/esqueleto mínimo (generado mediante un comando containerizado de un solo uso, nunca instalando Node en el host) para que el servicio `web` tenga algo que ejecutar mientras no exista todavía el scaffold completo de Next.js (que se construye en la Fase 2).
- [x] 1.4 Escribir `compose.yaml` con el servicio `web`: puerto interno `3000` (no publicado directamente al host), healthcheck propio, sin secretos hardcodeados (todo por variables de entorno referenciadas desde `.env`).
- [x] 1.5 Agregar el servicio `postgres` al `compose.yaml`: imagen con versión fijada, volumen persistente nombrado, healthcheck (`pg_isready`), `POSTGRES_DB`/`POSTGRES_USER`/`POSTGRES_PASSWORD` desde variables de entorno, puerto publicado únicamente en `127.0.0.1`.
- [x] 1.6 Agregar el servicio `migrate` al `compose.yaml`: misma imagen/código que `web`, `depends_on: postgres` con condición `service_healthy`, sin `restart` (finaliza y queda en estado `Exited (0)`, sin permanecer ejecutándose). **Nota**: como todavía no existe `schema.prisma` (Fase 2), `npm run migrate` es un placeholder que solo confirma el cableado del job (no simula ninguna migración real); la ejecución de una migración Prisma real queda pendiente de validar en la Fase 2.
- [x] 1.7 Agregar el servicio `minio` al `compose.yaml`: volumen persistente nombrado, healthcheck propio, API y consola web expuestas, credenciales (`MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`) desde variables de entorno, puertos publicados únicamente en `127.0.0.1`.
- [x] 1.8 Agregar el servicio `minio-init` al `compose.yaml`: `depends_on: minio` con condición `service_healthy`, crea automáticamente el bucket `OBJECT_STORAGE_BUCKET` si no existe, finaliza exitosamente tras crearlo (sin `restart`, sin permanecer ejecutándose).
- [x] 1.9 Agregar el servicio `mailpit` al `compose.yaml`: expone su puerto SMTP y su interfaz web de inspección; confirmar que la app, apuntando `SMTP_HOST` a este servicio, nunca envía correos a destinatarios reales.
- [x] 1.10 Escribir la configuración local de Nginx y agregar el servicio `nginx` al `compose.yaml`: publica la app en `http://localhost:8080`, proxy hacia `web:3000`, cabeceras `Upgrade`/`Connection` para soportar el WebSocket del hot reload de Next.js, sin configuración de HTTPS/TLS. Incluye `resolver`+variable en `proxy_pass` para que nginx no cachee la IP de `web` entre rebuilds. **Nota**: la negociación real de un WebSocket (HMR de Next.js) queda por validarse en la Fase 2; aquí se validó el proxy HTTP normal y el mecanismo de reinicio en caliente del bootstrap de la Fase 1 a través del proxy.
- [x] 1.11 Agregar el servicio opcional `adminer` bajo un `profile: tools`, confirmando que `docker compose up --build` (sin especificar el profile) no lo levanta.
- [x] 1.12 Crear la red interna de Docker Compose que conecta a todos los servicios, y confirmar que `postgres` y `minio` no quedan expuestos a ninguna interfaz distinta de `127.0.0.1`.
- [x] 1.13 Configurar volúmenes persistentes nombrados para `postgres` y `minio`.
- [x] 1.14 Crear `.env.example` con todas las variables usadas por `compose.yaml` y por la app (base de datos, `SESSION_SECRET`, `OBJECT_STORAGE_*`, `SMTP_*`, `APP_URL`/`NEXT_PUBLIC_APP_URL`), sin valores reales y sin ninguna credencial de AWS; confirmar que `compose.yaml` no contiene ningún secreto en texto plano y que `.env` permanece ignorado por Git.
- [x] 1.15 Verificar que `docker compose config` no reporta errores.
- [x] 1.16 Verificar que un único `docker compose up --build` levanta `web`, `postgres`, `migrate`, `minio`, `minio-init`, `mailpit` y `nginx` (con `migrate`/`minio-init` terminando en estado `Exited (0)`, no como error), y que `adminer` no se levanta salvo que se invoque el profile `tools`.
- [x] 1.17 Verificar que `postgres` y `minio` alcanzan estado `healthy`, y que el bucket configurado se crea automáticamente vía `minio-init`.
- [x] 1.18 Verificar que reiniciar los contenedores (`docker compose restart`, o `down` sin `-v` seguido de `up`) no elimina los datos persistentes de `postgres` ni de `minio`.
- [x] 1.19 Verificar que `nginx` publica la app en `http://localhost:8080` y que el hot reload funciona a través del proxy (validado contra el bootstrap Node de la Fase 1; el hot reload de Next.js propiamente dicho se revalida en la Fase 2).
- [x] 1.20 Documentar en el repositorio el procedimiento de arranque/actualización del entorno completo vía Docker Compose (un único comando, prerrequisitos — solo Docker y Docker Compose —, cómo levantar `adminer` opcionalmente, y cómo ejecutar comandos de la app vía `docker compose exec`/`docker compose run`).

## 2. Fundación técnica Next.js y Prisma

Todos los comandos de esta fase (scaffold de Next.js, instalación de dependencias, Prisma CLI, etc.) se ejecutan dentro del contenedor `web` (`docker compose exec web ...` o `docker compose run --rm web ...`), nunca instalando Node/npm/Prisma en el host — el entorno de la Fase 1 ya está corriendo antes de empezar esta fase.

- [x] 2.1 Completar el scaffold de Next.js (App Router) con TypeScript en modo estricto y Tailwind CSS configurado, sobre el esqueleto mínimo creado en la Fase 1. **Nota**: Next.js 16 usa Turbopack por defecto en `dev`/`build`; se fuerza `--webpack` explícitamente (`npm run dev`/`npm run build`) para poder aplicar el polling de hot reload que exige la Fase 1/2 sobre bind mounts de Docker Desktop.
- [x] 2.2 Configurar lint (ESLint) y formateo, y wirear los scripts `lint`, `typecheck`, `test`, `build` en `package.json` como el gate obligatorio antes de dar por completa cualquier tarea (regla de `CLAUDE.md`); todos se invocan vía `docker compose exec web npm run <script>`. Incluye además `prisma:generate` y `prisma:migrate` (ver 2.4/2.5).
- [x] 2.3 Alojar las fuentes Poppins e Inter dentro del proyecto (self-hosted) y eliminar cualquier dependencia de Google Fonts CDN.
- [x] 2.4 Inicializar Prisma (`docker compose exec web npx prisma init` o equivalente) y definir el `schema.prisma` inicial según el modelo de datos de `design.md` (Product, ProductColor, ProductImage, Request, EnabledComuna, BusinessSettings, DataRightsRequest, AdminUser, Session, AuditLogEntry, EmailLog — 11 modelos en total), usando el `DATABASE_URL`/variables `POSTGRES_*` ya definidas en la Fase 1. **Desviación**: se fijó Prisma en la línea 6.x (`6.19.3`), no 7.x — Prisma 7 elimina `datasource.url` en `schema.prisma` a favor de adaptadores + `prisma.config.ts`, lo que no coincide con "conexión mediante `DATABASE_URL`" tal como lo describe `design.md`; documentado también en el informe de esta sesión.
- [x] 2.5 Generar y aplicar la migración inicial de Prisma a través del servicio `migrate` (`docker compose run --rm migrate` o `docker compose exec web npx prisma migrate dev` en desarrollo iterativo). Migración `20260713010250_init` creada y aplicada; el servicio `migrate` ahora ejecuta `prisma migrate deploy` real (ya no el placeholder de la Fase 1).
- [x] 2.6 Definir la estructura de carpetas del monolito modular (`app/`, `modules/<dominio>/{schemas,repository,service}`, `components/`) descrita en "Arquitectura de módulos", incluyendo los módulos `data-rights`, `notifications` (abstracción SMTP) y `storage` (abstracción de almacenamiento de objetos). **Nota**: los tres módulos se crean como directorios placeholder (`README.md` explicando su alcance futuro y la fase que los implementa), sin la subdivisión `schemas/repository/service` todavía — esa subdivisión se llena de contenido real recién cuando cada módulo se implementa (Fases 5 y 7), para no crear carpetas vacías sin uso.
- [x] 2.7 Configurar logging estructurado (JSON) de la aplicación.
- [x] 2.8 Completar `.env.example` (creado en la Fase 1) con cualquier variable adicional específica de la aplicación que no estuviera ya cubierta. Verificado: todas las variables que usa `lib/env.ts` ya estaban cubiertas desde la Fase 1; no se necesitó agregar ninguna nueva.

## 3. Sitio público

- [x] 3.1 Portar el sistema visual base del mockup (paleta de colores, radios, sombras, tipografía) a tokens de Tailwind/CSS, sin copiar el markup del mockup. **Trasladada desde la Fase 2** (era 2.4): no correspondía al alcance técnico de esa fase (fundación técnica, sin páginas/estilos visuales del sitio); se implementa aquí porque el resto de las páginas de esta fase la necesitan.
- [x] 3.2 Implementar el layout global: header con navegación (desktop + drawer móvil), CTA de WhatsApp, footer, banner de cookies y botón flotante de WhatsApp, según `specs/public-site/spec.md`.
- [x] 3.3 Implementar la página de inicio (hero, beneficios, destacados del catálogo, banner del cotizador).
- [x] 3.4 Implementar la página de tipos de cristales (tipos, tratamientos, tabla comparativa). También se implementó la página de atención a domicilio (`/domicilio`) con los 4 pasos del proceso como contenido estático, ya que la especificación de la Fase 3 la incluye entre las rutas públicas requeridas aunque no tenga un ítem propio en este listado; el formulario persistente de esa página queda para la Fase 5 (tareas 5.4-5.5), reemplazado aquí por una tarjeta explicativa con CTA de WhatsApp.
- [x] 3.5 Implementar la página nosotros y la página de FAQ (acordeón accesible).
- [x] 3.6 Implementar la página de contacto. **Desviación**: los datos (WhatsApp, teléfono, correo, Instagram, horario, ubicación) se leen desde `lib/site-config.ts`, una configuración estática de placeholder, y no desde el modelo `BusinessSettings` persistido en base de datos, ya que la gestión de esa configuración vía panel administrativo corresponde a una fase posterior (Fase 5).
- [x] 3.7 Implementar las páginas legales (privacidad, términos) con el contenido del mockup y el aviso visible de "borrador pendiente de validación legal".
- [x] 3.8 Implementar el contenido informativo de la página de derechos ARCO (explicación de los 6 derechos); el formulario de envío (con persistencia real) se implementa en la Fase 5 junto con la capacidad `data-rights-requests`.
- [x] 3.9 Verificar accesibilidad básica (contraste, foco de teclado, `aria-label`) y responsive en los breakpoints definidos para todo lo implementado en esta fase, como primera pasada previa a la validación completa de la Fase 8.

## 4. Catálogo y productos

- [x] 4.1 Implementar el repositorio y servicio de catálogo (listar, filtrar, buscar) sobre Prisma, según `specs/product-catalog/spec.md`. Se añadió `Product.slug` (no estaba en el modelo ilustrativo de `design.md`, ver decisión documentada allí) para poder enrutar `/catalogo/[slug]`.
- [x] 4.2 Implementar la página de catálogo público (listado, buscador, filtros, drawer de filtros en móvil, estado vacío).
- [x] 4.3 Implementar la ficha de producto pública (galería, specs, colores, disponibilidad, productos relacionados, CTAs de cotizar/WhatsApp).
- [x] 4.4 Escribir un seed de Prisma opcional con los 10 productos de ejemplo del mockup (array `SEED` — no confundir con los 11 modelos de `schema.prisma`), ejecutable vía `docker compose exec web npx prisma db seed`. **Trasladada desde la Fase 2** (era 2.10): no correspondía al alcance técnico de esa fase; tiene más sentido aquí, una vez que existe el repositorio/servicio de catálogo (4.1) que consume esos datos de ejemplo.

El CRUD administrativo de modelos (antes 4.4-4.7 en este listado) se trasladó a la Fase 6 (tareas 6.10-6.13): depende de autenticación y del panel administrativo, que no existen todavía en esta fase. La Fase 4 contiene únicamente catálogo público, ficha pública, filtros, repositorio/servicio de lectura y seed de desarrollo.

## 5. Formularios y solicitudes

- [ ] 5.1 Implementar el cotizador público de 5 pasos (armazón, cristal, tratamientos, indicación de receta sin adjuntar archivo, datos de contacto) según `specs/quote-requests/spec.md`.
- [ ] 5.2 Implementar validación Zod (client + server) del cotizador, incluyendo consentimiento obligatorio y formato de correo.
- [ ] 5.3 Implementar el envío del cotizador: creación de `Request` tipo cotización, cálculo de `retentionExpiresAt`, pantalla de éxito con CTA de WhatsApp.
- [ ] 5.4 Implementar el formulario público de atención a domicilio (incluye el campo de correo agregado respecto del mockup) según `specs/home-visit-requests/spec.md`, con validación contra la lista de comunas habilitadas.
- [ ] 5.5 Implementar el envío de la consulta de domicilio: creación de `Request` tipo atención a domicilio, pantalla de éxito con CTA de WhatsApp.
- [ ] 5.6 Implementar la gestión administrativa de comunas habilitadas en `/admin/home-visits` (listar, agregar, activar/desactivar) según `specs/home-visit-coverage/spec.md`.
- [ ] 5.7 Implementar la bandeja administrativa unificada de solicitudes comerciales en `/admin/requests` (listado, filtro por tipo, cambio de estado, contacto por WhatsApp, eliminación con confirmación, estado vacío) según `specs/request-inbox/spec.md`.
- [ ] 5.8 Implementar la configuración de negocio en `/admin/settings` (datos de contacto y período de retención de solicitudes comerciales y de derechos ARCO) según `specs/business-settings/spec.md` (autorización real dependiente de la Fase 6).
- [ ] 5.9 Implementar el envío del formulario de derechos ARCO (completado en la Fase 3): validación Zod client + server, creación de `DataRightsRequest` con estado `RECEIVED`, cálculo de `retentionExpiresAt`, y pantalla de confirmación, según `specs/data-rights-requests/spec.md`.
- [ ] 5.10 Implementar el envío de la notificación por correo al negocio al crearse una solicitud de derechos ARCO, registrando el intento en `EmailLog`.
- [ ] 5.11 Implementar la sección/tab "Derechos ARCO" dentro de `/admin/requests`, separada de la bandeja comercial, con su propio flujo de estados (`RECEIVED`/`IN_REVIEW`/`RESOLVED`/`REJECTED`) y campo de notas de resolución.
- [ ] 5.12 Conectar los cambios de estado de solicitudes de derechos ARCO al registro de auditoría (dependiente de la Fase 6 para el modelo de usuario, puede quedar con un TODO explícito hasta entonces, igual que 4.7).
- [ ] 5.13 Implementar el módulo `notifications` (abstracción SMTP: `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_FROM`) que envía todos los correos anteriores; en este entorno, `SMTP_HOST` apunta al servicio `mailpit` (ver Fase 1), sin autenticación real y sin salir nunca a destinatarios reales.

## 6. Autenticación y administración

- [ ] 6.1 Implementar el modelo de `AdminUser`, `Session` y roles (`SUPERADMIN`/`ADMIN`) con hash de contraseña (`argon2id` o `bcrypt`).
- [ ] 6.2 Implementar el flujo de inicio de sesión de `/admin` (formulario, verificación de credenciales, creación de sesión persistida) según `specs/admin-auth/spec.md`.
- [ ] 6.3 Implementar límite de intentos de inicio de sesión por IP/usuario.
- [ ] 6.4 Implementar cierre de sesión e invalidación de sesiones persistidas, y expiración por inactividad.
- [ ] 6.5 Implementar el middleware/guard de protección de rutas `/admin/**` por sesión válida y por rol, con revalidación server-side en cada mutación administrativa.
- [ ] 6.6 Implementar `/admin/users` (crear usuario, desactivar usuario, protección contra desactivar al único `SUPERADMIN` activo), accesible solo para `SUPERADMIN`.
- [ ] 6.7 Retomar y completar la protección por rol pendiente de la Fase 5 (comunas, solicitudes comerciales, solicitudes de derechos ARCO y configuración) ahora que existe el modelo de auth real. La protección de `/admin/products` no queda pendiente de una fase anterior: se implementa directamente junto con las tareas 6.10-6.13 de esta misma fase.
- [ ] 6.8 Implementar el registro de auditoría (`AuditLogEntry`) y conectarlo a todas las acciones administrativas sensibles listadas en `specs/admin-auth/spec.md`, incluyendo los cambios de estado de solicitudes de derechos ARCO (pendientes de la Fase 5).
- [ ] 6.9 Crear el script/comando para provisionar el primer usuario `SUPERADMIN` en un entorno nuevo (sin credenciales hardcodeadas en el código, a diferencia del mockup) — ejecutado vía `docker compose exec web ...`, usable tanto en este entorno de desarrollo como en un futuro entorno productivo.
- [ ] 6.10 Implementar el listado administrativo de modelos en `/admin/products` (tabla, KPIs) según `specs/product-management/spec.md`. **Trasladada desde la Fase 4** (era 4.4): depende de autenticación y del panel administrativo, que se implementan en esta misma fase.
- [ ] 6.11 Implementar alta y edición de modelo (formulario completo: datos, colores predefinidos/custom, disponibilidad, etiqueta), con validación Zod client + server. **Trasladada desde la Fase 4** (era 4.5), mismo motivo que 6.10.
- [ ] 6.12 Implementar eliminación de modelo con confirmación inline. **Trasladada desde la Fase 4** (era 4.6), mismo motivo que 6.10.
- [ ] 6.13 Conectar las mutaciones de productos (alta, edición, eliminación) al registro de auditoría (`AuditLogEntry`, ver 6.8). **Trasladada desde la Fase 4** (era 4.7): ya no depende de una fase futura, porque ahora está en la misma fase que el modelo de usuario y el registro de auditoría.

## 7. Almacenamiento de imágenes

- [ ] 7.1 Implementar el módulo `storage` como abstracción de almacenamiento de objetos compatible con S3, configurada por `OBJECT_STORAGE_ENDPOINT`/`OBJECT_STORAGE_REGION`/`OBJECT_STORAGE_BUCKET`/`OBJECT_STORAGE_ACCESS_KEY`/`OBJECT_STORAGE_SECRET_KEY`/`OBJECT_STORAGE_FORCE_PATH_STYLE`, sin acoplarse a un SDK de proveedor específico más allá de un cliente S3 estándar.
- [ ] 7.2 Implementar validación server-side de archivos subidos (tipo MIME, tamaño máximo) según `specs/product-image-storage/spec.md`.
- [ ] 7.3 Implementar el procesamiento server-side de imágenes (redimensionado/optimización), reemplazando el resize por `<canvas>` del navegador del mockup.
- [ ] 7.4 Implementar la subida al bucket configurado (`OBJECT_STORAGE_BUCKET`) y el guardado de la referencia (`storageKey`/URL) en `ProductImage`; en este entorno, el bucket vive en el servicio `minio` (ver Fase 1) y se crea automáticamente vía `minio-init`.
- [ ] 7.5 Implementar el reemplazo de una imagen ya asignada a una posición (principal/frontal/lateral).
- [ ] 7.6 Conectar la entrega de imágenes en catálogo/ficha de producto al mecanismo de optimización de imágenes de Next.js apuntando al endpoint configurado.
- [ ] 7.7 Actualizar el formulario de alta/edición de modelo (Fase 6, tarea 6.11) para usar este flujo real de subida en vez de cualquier placeholder temporal usado antes.

## 8. Seguridad, auditoría y accesibilidad

- [ ] 8.1 Implementar rate limiting en los formularios públicos (cotizador, atención a domicilio, ARCO) además del ya implementado en login.
- [ ] 8.2 Configurar cabeceras de seguridad (CSP, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`).
- [ ] 8.3 Configurar cookies de sesión como `httpOnly`, `sameSite=lax` (el flag `secure` se activa cuando corresponda bajo HTTPS, fuera del alcance de este entorno), y verificar mitigación CSRF en las mutaciones administrativas.
- [ ] 8.4 Configurar el usuario de base de datos de la aplicación con privilegios mínimos (no superusuario de Postgres).
- [ ] 8.5 Configurar auditoría de dependencias (`npm audit`/Dependabot o equivalente) como parte del repositorio.
- [ ] 8.6 Revisar y documentar en el propio repositorio (no como código) cualquier decisión de seguridad tomada durante la implementación que no estuviera ya cubierta por `design.md`, conforme a la regla de "documentar toda decisión arquitectónica relevante".
- [ ] 8.7 Ejecutar la lista de validación manual de accesibilidad completa de `design.md` (teclado, foco, formularios, contraste, textos alternativos, lector de pantalla) sobre las páginas públicas principales y las pantallas clave del panel admin, documentando el resultado; no se requiere contratar una auditoría externa.
- [ ] 8.8 Confirmar que no existe ninguna credencial de AWS ni de ningún proveedor cloud en el repositorio, en `.env.example`, ni en el propio `.env` de desarrollo.

## 9. Pruebas y CI

Todos los comandos de esta fase (tests, lint, typecheck, build) se ejecutan dentro de contenedores (vía `docker compose exec`/`docker compose run`, o un job de CI que use la misma imagen de `web`), nunca instalando Node/Prisma directamente en el runner sin contenedor. Esta fase no incluye ningún paso de despliegue ni de construcción/publicación de infraestructura, porque no hay ningún destino de despliegue en el alcance de esta propuesta.

- [ ] 9.1 Agregar las dependencias/configuración base de las comprobaciones de accesibilidad (`axe`, Lighthouse CI) al proyecto, instaladas dentro del contenedor `web`. **Trasladada desde la Fase 2** (era 2.11): no correspondía al alcance técnico de esa fase; se implementa aquí, justo antes de conectarlas al pipeline (9.6), en vez de instalarlas de antemano sin usarlas.
- [ ] 9.2 Escribir tests unitarios (schemas Zod, lógica de negocio pura de cada `service`: cálculo de `retentionExpiresAt`, filtrado de catálogo, reglas de disponibilidad de comuna, etc.), ejecutables vía `docker compose exec web npm test`.
- [ ] 9.3 Escribir tests de integración (repositorios Prisma, route handlers/server actions) contra una base de datos de pruebas (un servicio `postgres` efímero adicional dentro del propio Docker Compose, nunca una instalación local de Postgres), cubriendo al menos: CRUD de producto, envío de cotización y de consulta de domicilio (incluyendo verificación en `EmailLog`), login/logout de admin, cambio de estado de solicitudes, gestión de comunas habilitadas.
- [ ] 9.4 Escribir tests end-to-end (Playwright u equivalente) para los flujos críticos listados en "Plan de pruebas" de `design.md`, corriendo contra el propio entorno de Docker Compose (incluyendo verificar que los correos aparecen en Mailpit y que las imágenes terminan en el bucket de MinIO).
- [ ] 9.5 Configurar el workflow de GitHub Actions que ejecuta lint, typecheck, tests y build en cada pull request (gate obligatorio antes de mergear), ejecutando esos comandos dentro de un contenedor equivalente al de `web` (o vía `docker compose run`), no instalados directamente en el runner.
- [ ] 9.6 Wirear `axe` y Lighthouse CI al pipeline (ejecutándose sobre páginas públicas principales y pantallas clave del panel admin en cada pull request), definiendo y aplicando un umbral concreto que haga fallar el build si no se cumple.
- [ ] 9.7 Verificar en CI que `docker compose config` no reporta errores, como parte del gate.
- [ ] 9.8 Confirmar que el pipeline no incluye ningún paso de construcción de imagen para un registro remoto, publicación, ni despliegue — y que no referencia ninguna credencial de AWS.

## 10. Infraestructura productiva (fuera de alcance)

- [ ] 10.1 (Nota, no una tarea de implementación) La infraestructura y el despliegue productivos — instancia, red, TLS/certificados, DNS, base de datos gestionada o no, object storage productivo, backups en la nube, pipelines de despliegue, ambientes de staging — serán creados y configurados **manualmente por el propietario del proyecto en una etapa posterior**, y se abordarán mediante una propuesta OpenSpec separada cuando corresponda. Esta fase no contiene tareas de implementación dentro del alcance actual.
