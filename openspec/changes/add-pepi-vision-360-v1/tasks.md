## 1. Fundación técnica

- [ ] 1.1 Inicializar el proyecto Next.js (App Router) con TypeScript en modo estricto y Tailwind CSS configurado.
- [ ] 1.2 Configurar lint (ESLint) y formateo, y wirear los scripts `lint`, `typecheck`, `test`, `build` en `package.json` como el gate obligatorio antes de dar por completa cualquier tarea (regla de `CLAUDE.md`).
- [ ] 1.3 Alojar las fuentes Poppins e Inter dentro del proyecto (self-hosted) y eliminar cualquier dependencia de Google Fonts CDN.
- [ ] 1.4 Portar el sistema visual base del mockup (paleta de colores, radios, sombras, tipografía) a tokens de Tailwind/CSS, sin copiar el markup del mockup.
- [ ] 1.5 Inicializar Prisma y definir el `schema.prisma` inicial según el modelo de datos de `design.md` (Product, ProductColor, ProductImage, Request, DataRightsRequest, EnabledComuna, BusinessSettings, AdminUser, Session, AuditLogEntry, EmailLog).
- [ ] 1.6 Crear la migración inicial de Prisma y un entorno de base de datos local (Postgres vía Docker Compose de desarrollo) para trabajar contra él.
- [ ] 1.7 Definir la estructura de carpetas del monolito modular (`app/`, `modules/<dominio>/{schemas,repository,service}`, `components/`) descrita en "Arquitectura de módulos", incluyendo el módulo `data-rights` para derechos ARCO.
- [ ] 1.8 Configurar logging estructurado (JSON) de la aplicación.
- [ ] 1.9 Crear `.env.example` documentando todas las variables de entorno necesarias (base de datos, sesión, Object Storage, correo, y `APP_URL`/`NEXT_PUBLIC_APP_URL` para el dominio/URL de la app, sin acoplar el código a un dominio específico), sin valores reales, y confirmar que `.env*` real permanece fuera de Git.
- [ ] 1.10 Escribir un seed de Prisma opcional con los 10 modelos de ejemplo del mockup (`SEED`) para poblar un entorno de desarrollo/demo.
- [ ] 1.11 Agregar las dependencias/configuración base de las comprobaciones de accesibilidad (`axe`, Lighthouse CI) al proyecto, sin necesidad de wirearlas al pipeline todavía (eso ocurre en la Fase 9).

## 2. Sitio público

- [ ] 2.1 Implementar el layout global: header con navegación (desktop + drawer móvil), CTA de WhatsApp, footer, banner de cookies y botón flotante de WhatsApp, según `specs/public-site/spec.md`.
- [ ] 2.2 Implementar la página de inicio (hero, beneficios, destacados del catálogo, banner del cotizador).
- [ ] 2.3 Implementar la página de tipos de cristales (tipos, tratamientos, tabla comparativa).
- [ ] 2.4 Implementar la página nosotros y la página de FAQ (acordeón accesible).
- [ ] 2.5 Implementar la página de contacto, leyendo los datos desde `business-settings`.
- [ ] 2.6 Implementar las páginas legales (privacidad, términos) con el contenido del mockup y el aviso visible de "borrador pendiente de validación legal".
- [ ] 2.7 Implementar el contenido informativo de la página de derechos ARCO (explicación de los 6 derechos); el formulario de envío (con persistencia real) se implementa en la Fase 4 junto con la capacidad `data-rights-requests`.
- [ ] 2.8 Verificar accesibilidad básica (contraste, foco de teclado, `aria-label`) y responsive en los breakpoints definidos para todo lo implementado en esta fase, como primera pasada previa a la validación completa de la Fase 7.

## 3. Catálogo y productos

- [ ] 3.1 Implementar el repositorio y servicio de catálogo (listar, filtrar, buscar) sobre Prisma, según `specs/product-catalog/spec.md`.
- [ ] 3.2 Implementar la página de catálogo público (listado, buscador, filtros, drawer de filtros en móvil, estado vacío).
- [ ] 3.3 Implementar la ficha de producto pública (galería, specs, colores, disponibilidad, productos relacionados, CTAs de cotizar/WhatsApp).
- [ ] 3.4 Implementar el listado administrativo de modelos en `/admin/products` (tabla, KPIs) según `specs/product-management/spec.md`.
- [ ] 3.5 Implementar alta y edición de modelo (formulario completo: datos, colores predefinidos/custom, disponibilidad, etiqueta), con validación Zod client + server.
- [ ] 3.6 Implementar eliminación de modelo con confirmación inline.
- [ ] 3.7 Conectar las mutaciones de productos al registro de auditoría (dependiente de la Fase 5 para el modelo de usuario, puede quedar con un TODO explícito hasta entonces).

## 4. Formularios y solicitudes

- [ ] 4.1 Implementar el cotizador público de 5 pasos (armazón, cristal, tratamientos, indicación de receta sin adjuntar archivo, datos de contacto) según `specs/quote-requests/spec.md`.
- [ ] 4.2 Implementar validación Zod (client + server) del cotizador, incluyendo consentimiento obligatorio y formato de correo.
- [ ] 4.3 Implementar el envío del cotizador: creación de `Request` tipo cotización, cálculo de `retentionExpiresAt`, pantalla de éxito con CTA de WhatsApp.
- [ ] 4.4 Implementar el formulario público de atención a domicilio (incluye el campo de correo agregado respecto del mockup) según `specs/home-visit-requests/spec.md`, con validación contra la lista de comunas habilitadas.
- [ ] 4.5 Implementar el envío de la consulta de domicilio: creación de `Request` tipo atención a domicilio, pantalla de éxito con CTA de WhatsApp.
- [ ] 4.6 Implementar la gestión administrativa de comunas habilitadas en `/admin/home-visits` (listar, agregar, activar/desactivar) según `specs/home-visit-coverage/spec.md`.
- [ ] 4.7 Implementar la bandeja administrativa unificada de solicitudes comerciales en `/admin/requests` (listado, filtro por tipo, cambio de estado, contacto por WhatsApp, eliminación con confirmación, estado vacío) según `specs/request-inbox/spec.md`.
- [ ] 4.8 Implementar la configuración de negocio en `/admin/settings` (datos de contacto y período de retención de solicitudes comerciales y de derechos ARCO) según `specs/business-settings/spec.md` (autorización real dependiente de la Fase 5).
- [ ] 4.9 Implementar el envío del formulario de derechos ARCO (completado en la Fase 2): validación Zod client + server, creación de `DataRightsRequest` con estado `RECEIVED`, cálculo de `retentionExpiresAt`, y pantalla de confirmación, según `specs/data-rights-requests/spec.md`.
- [ ] 4.10 Implementar el envío de la notificación por correo al negocio al crearse una solicitud de derechos ARCO, registrando el intento en `EmailLog`.
- [ ] 4.11 Implementar la sección/tab "Derechos ARCO" dentro de `/admin/requests`, separada de la bandeja comercial, con su propio flujo de estados (`RECEIVED`/`IN_REVIEW`/`RESOLVED`/`REJECTED`) y campo de notas de resolución.
- [ ] 4.12 Conectar los cambios de estado de solicitudes de derechos ARCO al registro de auditoría (dependiente de la Fase 5 para el modelo de usuario, puede quedar con un TODO explícito hasta entonces, igual que 3.7).

## 5. Autenticación y administración

- [ ] 5.1 Implementar el modelo de `AdminUser`, `Session` y roles (`SUPERADMIN`/`ADMIN`) con hash de contraseña (`argon2id` o `bcrypt`).
- [ ] 5.2 Implementar el flujo de inicio de sesión de `/admin` (formulario, verificación de credenciales, creación de sesión persistida) según `specs/admin-auth/spec.md`.
- [ ] 5.3 Implementar límite de intentos de inicio de sesión por IP/usuario.
- [ ] 5.4 Implementar cierre de sesión e invalidación de sesiones persistidas, y expiración por inactividad.
- [ ] 5.5 Implementar el middleware/guard de protección de rutas `/admin/**` por sesión válida y por rol, con revalidación server-side en cada mutación administrativa.
- [ ] 5.6 Implementar `/admin/users` (crear usuario, desactivar usuario, protección contra desactivar al único `SUPERADMIN` activo), accesible solo para `SUPERADMIN`.
- [ ] 5.7 Retomar y completar la protección por rol pendiente de la Fase 3 y la Fase 4 (gestión de productos, comunas, solicitudes comerciales, solicitudes de derechos ARCO y configuración) ahora que existe el modelo de auth real.
- [ ] 5.8 Implementar el registro de auditoría (`AuditLogEntry`) y conectarlo a todas las acciones administrativas sensibles listadas en `specs/admin-auth/spec.md`, incluyendo los cambios de estado de solicitudes de derechos ARCO (pendientes de la Fase 4).
- [ ] 5.9 Crear el script/comando para provisionar el primer usuario `SUPERADMIN` en un despliegue nuevo (sin credenciales hardcodeadas en el código, a diferencia del mockup).

## 6. Almacenamiento de imágenes

- [ ] 6.1 Configurar el cliente de Lightsail Object Storage (API S3) y las variables de entorno correspondientes.
- [ ] 6.2 Implementar validación server-side de archivos subidos (tipo MIME, tamaño máximo) según `specs/product-image-storage/spec.md`.
- [ ] 6.3 Implementar el procesamiento server-side de imágenes (redimensionado/optimización), reemplazando el resize por `<canvas>` del navegador del mockup.
- [ ] 6.4 Implementar la subida al bucket y el guardado de la referencia (`storageKey`/URL) en `ProductImage`.
- [ ] 6.5 Implementar el reemplazo de una imagen ya asignada a una posición (principal/frontal/lateral).
- [ ] 6.6 Conectar la entrega de imágenes en catálogo/ficha de producto al mecanismo de optimización de imágenes de Next.js apuntando al almacenamiento externo.
- [ ] 6.7 Actualizar el formulario de alta/edición de modelo (Fase 3) para usar este flujo real de subida en vez de cualquier placeholder temporal usado antes.

## 7. Seguridad y auditoría

- [ ] 7.1 Implementar rate limiting en los formularios públicos (cotizador, atención a domicilio, ARCO) además del ya implementado en login.
- [ ] 7.2 Configurar cabeceras de seguridad (CSP, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`).
- [ ] 7.3 Configurar cookies de sesión como `httpOnly`, `secure`, `sameSite=lax`, y verificar mitigación CSRF en las mutaciones administrativas.
- [ ] 7.4 Configurar el usuario de base de datos de la aplicación con privilegios mínimos (no superusuario de Postgres).
- [ ] 7.5 Configurar auditoría de dependencias (`npm audit`/Dependabot o equivalente) como parte del repositorio.
- [ ] 7.6 Revisar y documentar en el propio repositorio (no como código) cualquier decisión de seguridad tomada durante la implementación que no estuviera ya cubierta por `design.md`, conforme a la regla de "documentar toda decisión arquitectónica relevante".
- [ ] 7.7 Ejecutar la lista de validación manual de accesibilidad completa de `design.md` (teclado, foco, formularios, contraste, textos alternativos, lector de pantalla) sobre las páginas públicas principales y las pantallas clave del panel admin, documentando el resultado; no se requiere contratar una auditoría externa para este hito.

## 8. Docker y Nginx

- [ ] 8.1 Escribir el `Dockerfile` de producción de la aplicación Next.js (build multi-stage).
- [ ] 8.2 Escribir el `docker-compose.yml` de producción con los servicios `app`, `db` (Postgres, sin puerto publicado) y `nginx`.
- [ ] 8.3 Configurar Nginx como reverse proxy: terminación TLS, redirección HTTP→HTTPS, cabeceras de seguridad, proxy hacia el contenedor `app`.
- [ ] 8.4 Verificar mediante una prueba local que Postgres no es alcanzable fuera de la red interna de Docker Compose.
- [ ] 8.5 Documentar el procedimiento de arranque/actualización local del stack completo vía Docker Compose.
- [ ] 8.6 Documentar y probar el procedimiento de "validación local con build productivo" (levantar localmente la misma imagen Docker y el mismo `docker-compose.yml` que se usarán en producción, según "Ambientes" en `design.md`) como paso previo obligatorio a cualquier despliegue.

## 9. CI/CD

- [ ] 9.1 Configurar el workflow de GitHub Actions que ejecuta lint, typecheck, tests y build en cada pull request (gate obligatorio antes de mergear).
- [ ] 9.2 Configurar el workflow de construcción de la imagen Docker de producción.
- [ ] 9.3 Configurar el paso de despliegue automatizado hacia la instancia Lightsail (o publicación de la imagen a un registro, según se resuelva en la Fase 10).
- [ ] 9.4 Configurar la inyección de secretos (credenciales de base de datos, Object Storage, correo, secreto de sesión) en el pipeline sin exponerlos en el repositorio ni en logs de CI.
- [ ] 9.5 Configurar la ejecución del job diario de `pg_dump` como parte de la infraestructura desplegada (ver Fase 10), no del propio pipeline de CI.
- [ ] 9.6 Wirear `axe` y Lighthouse CI al pipeline (ejecutándose sobre páginas públicas principales y pantallas clave del panel admin en cada pull request), definiendo y aplicando un umbral concreto que haga fallar el build si no se cumple.
- [ ] 9.7 Configurar un "environment" de GitHub Actions con aprobación manual requerida (reviewers) antes de que el job de despliegue a producción se ejecute.
- [ ] 9.8 Documentar el procedimiento para levantar un ambiente de staging efímero bajo demanda (misma imagen/compose que producción) y el criterio de qué cambios lo ameritan (migraciones de datos, cambios de autenticación/autorización, cambios de infraestructura), incluyendo cómo se destruye al terminar.

## 10. Despliegue en Lightsail

- [ ] 10.1 Aprovisionar la instancia Lightsail y el firewall (solo 22/80/443 abiertos).
- [ ] 10.2 Aprovisionar el/los bucket(s) de Lightsail Object Storage (imágenes de producto y backups).
- [ ] 10.3 Resolver el prerrequisito de despliegue de dominio y proveedor DNS definitivos (fuera del alcance de la implementación en sí), y configurar `APP_URL`/`NEXT_PUBLIC_APP_URL` junto con el certificado TLS apuntando a ese dominio.
- [ ] 10.4 Resolver la decisión pendiente de proveedor de correo (AWS SES propuesto): verificar dominio de envío y solicitar salida de modo sandbox antes de considerar el correo funcional en producción.
- [ ] 10.5 Desplegar el stack completo (Docker Compose + Nginx) en la instancia y ejecutar la migración inicial de Prisma contra la base de datos de producción.
- [ ] 10.6 Configurar el job diario de `pg_dump` con subida al bucket de backups y verificar que se ejecuta correctamente al menos una vez.
- [ ] 10.7 Ejecutar y documentar una restauración de prueba completa desde un backup, en un entorno separado de producción.
- [ ] 10.8 Provisionar el primer usuario `SUPERADMIN` en producción mediante el script/comando de la Fase 5 (sin credenciales hardcodeadas).
- [ ] 10.9 Verificar en producción los criterios de aceptación de `design.md` (HTTPS obligatorio, Postgres no público, backups funcionando, CI en verde con las comprobaciones de accesibilidad, aprobación manual de despliegue efectiva, dominio resuelto vía `APP_URL`/`NEXT_PUBLIC_APP_URL`, páginas legales marcadas como borrador, solicitudes de derechos ARCO persistiendo y notificando correctamente).
- [ ] 10.10 Confirmar que el contenido de `design-reference/` permanece intacto y sin modificaciones tras todo el proceso de implementación.
