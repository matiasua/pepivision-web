# modules/notifications

Abstracción de correo (`SMTP_*`), independiente del proveedor: en
desarrollo apunta a Mailpit (ver Fase 1); en producción, a lo que se
configure cuando exista esa infraestructura.

- `client.ts` — transporte SMTP (nodemailer) singleton, construido desde `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`.
- `templates.ts` — asunto + cuerpo de texto plano para cada correo (confirmación de cotización, notificación de cotización al negocio, confirmación de domicilio, notificación de domicilio al negocio, notificación de derechos ARCO al negocio).
- `service.ts` — `sendAndLog()`: envía y registra el resultado en `EmailLog`, sin lanzar nunca una excepción (una falla de envío nunca debe eliminar la solicitud ya persistida).

Usado por `modules/requests` y `modules/data-rights` (Fase 5).
