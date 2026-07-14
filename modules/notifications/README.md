# modules/notifications

Abstracción de correo (`SMTP_*`), independiente del proveedor: en
desarrollo apunta a Mailpit (ver Fase 1); en producción, a lo que se
configure cuando exista esa infraestructura.

- `client.ts` — transporte SMTP (nodemailer) singleton, construido desde `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_SECURE`/`SMTP_REQUIRE_TLS`, más DKIM opcional (`DKIM_DOMAIN_NAME`/`DKIM_KEY_SELECTOR`/`DKIM_PRIVATE_KEY`).
- `templates.ts` — barrel de re-exportación sobre `email/templates/*` (mantiene estable el import path usado por `modules/requests` y `modules/data-rights`).
- `email/` — arquitectura reutilizable de correo HTML (ver más abajo).
- `service.ts` — `sendAndLog()`: envía (subject + text + html) y registra el resultado en `EmailLog`, sin lanzar nunca una excepción (una falla de envío nunca debe eliminar la solicitud ya persistida).

Usado por `modules/requests` y `modules/data-rights`.

## `email/` — plantillas HTML reutilizables

- `config.ts` — URLs absolutas (logo, CTAs de administración) construidas desde `EMAIL_ASSET_BASE_URL`/`APP_URL`, nunca localhost ni rutas relativas hardcodeadas.
- `styles.ts` — paleta de marca copiada literal de `app/globals.css` + pila de fuentes segura (Arial/Helvetica, sin Google Fonts).
- `format.ts` — fechas en español/America-Santiago, id corto de solicitud, listas.
- `components.ts` — `escapeHtml`/`escapeHtmlMultiline` (toda entrada de usuario pasa por aquí antes de tocar el HTML), `renderDataRow`, `renderInfoCard`, `renderStatusBadge`, `renderButton`, `renderNotice`.
- `layout.ts` — `renderEmailHeader`/`renderEmailFooter`/`renderEmailLayout`: documento HTML basado en tablas, estilos inline, sin JS/flexbox-grid/CSS externo, preheader oculto.
- `templates/` — un archivo por correo, cada uno retorna `{subject, preheader, html, text}`.

Nunca se duplica el documento HTML completo por plantilla: solo se combinan estas piezas.

## Entregabilidad y anti-spam

Lo que el código de esta app controla directamente (`service.ts`):

- **From con nombre visible** (`Pepi Visión 360 <no-reply@...>`), nunca solo una dirección pelada.
- **Reply-To nunca es el remitente no-reply**: en correos al cliente apunta al correo real de contacto del negocio (`BusinessSettings.email`); en correos al negocio apunta al correo del cliente cuando existe, para poder responder con un solo clic.
- **Encabezados `Auto-Submitted: auto-generated` y `X-Auto-Response-Suppress: All`** (RFC 3834) — le indican a Exchange/Outlook y otros sistemas que esto es correo automático transaccional, evitando bucles de autorespuesta y penalizaciones asociadas a mensajes "no identificados".
- **HTML + texto plano siempre juntos** (multipart/alternative, generado automáticamente por Nodemailer) — un correo solo-HTML o solo-imágenes es una señal común de spam.
- **Sin adjuntos, sin base64, sin JavaScript, sin URLs acortadas, sin contenido oculto** — todo el contenido dinámico pasa por `escapeHtml`.
- **TLS configurable** vía `SMTP_SECURE`/`SMTP_REQUIRE_TLS` (ambos en `false` solo porque Mailpit no soporta TLS; un proveedor SMTP real en producción debe activar al menos uno).
- **DKIM opcional** vía `DKIM_DOMAIN_NAME`/`DKIM_KEY_SELECTOR`/`DKIM_PRIVATE_KEY` — Nodemailer firma automáticamente cada mensaje saliente cuando las tres variables están presentes.

Lo que **NO** puede resolver esta aplicación (requiere configuración DNS del dominio real de envío, fuera del alcance de Docker Compose y de este repositorio):

- **SPF**: registro TXT en el dominio de `SMTP_FROM` autorizando al servidor/proveedor SMTP real a enviar en su nombre.
- **DKIM**: además de las variables de arriba, el proveedor SMTP (o un servicio como Amazon SES) debe publicar la clave pública DKIM correspondiente como registro TXT (`<selector>._domainkey.<dominio>`).
- **DMARC**: registro TXT (`_dmarc.<dominio>`) con una política (`p=quarantine` o `p=reject` recomendado una vez que SPF/DKIM estén verificados) y, opcionalmente, una dirección `rua=` para reportes agregados.

Estas tres configuraciones deben documentarse como parte del despliegue real (Lightsail + proveedor SMTP definitivo) cuando exista un dominio de producción — no antes, y no simulando credenciales/dominios falsos en este entorno de desarrollo.
