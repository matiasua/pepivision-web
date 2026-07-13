# modules/requests

Implementa `quote-requests` y `home-visit-requests` (ver
`openspec/changes/add-pepi-vision-360-v1/specs/`): persistencia real de
cotizaciones y consultas de atención a domicilio, validación, cálculo de
retención y disparo de notificaciones por correo.

- `schemas.ts` — validación Zod compartida cliente/servidor, incluye el campo honeypot.
- `repository.ts` — acceso a datos vía Prisma (`Request`, lectura de `Product`/`EnabledComuna`).
- `service.ts` — `submitQuote()` / `submitHomeVisit()`: valida, persiste, calcula `retentionExpiresAt` y dispara las notificaciones de `modules/notifications`.

La bandeja administrativa (`request-inbox`) y la gestión de comunas
(`home-visit-coverage`) todavía no se implementan aquí: dependen de
`admin-auth` (Fase 6).
