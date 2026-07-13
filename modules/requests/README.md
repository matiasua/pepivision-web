# modules/requests

Implementa `quote-requests` y `home-visit-requests` (ver
`openspec/changes/add-pepi-vision-360-v1/specs/`): persistencia real de
cotizaciones y consultas de atención a domicilio, validación, cálculo de
retención y disparo de notificaciones por correo.

- `schemas.ts` — validación Zod compartida cliente/servidor, incluye el campo honeypot.
- `repository.ts` — acceso a datos vía Prisma (`Request`, lectura de `Product`/`EnabledComuna`).
- `service.ts` — `submitQuote()` / `submitHomeVisit()`: valida, persiste, calcula `retentionExpiresAt` y dispara las notificaciones de `modules/notifications`.

`request-inbox` (bandeja administrativa en `/admin/requests`, Fase 6):
`admin-schemas.ts` (filtros por tipo/estado/fecha), `admin-repository.ts`
(listado, cambio de estado, eliminación con soft-delete vía `deletedAt`) y
`admin-service.ts` (+ enlace de WhatsApp al cliente, auditoría).

La gestión de comunas vive en `modules/home-visit-coverage` (módulo separado).
