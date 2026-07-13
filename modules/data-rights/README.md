# modules/data-rights

Implementa la capacidad `data-rights-requests` (ver
`openspec/changes/add-pepi-vision-360-v1/specs/data-rights-requests/spec.md`).

- `schemas.ts` — validación Zod de entrada (incluye el campo honeypot), sin RUT ni adjuntos (minimización de datos).
- `repository.ts` — acceso a datos vía Prisma (`DataRightsRequest`).
- `service.ts` — `submitDataRightsRequest()`: crea el registro con estado inicial `RECEIVED`, calcula `retentionExpiresAt` y notifica al negocio (sin correo de confirmación al cliente, según la especificación).

La transición de estados (`RECEIVED`/`IN_REVIEW`/`RESOLVED`/`REJECTED`) y su
sección en `/admin/requests` todavía no se implementan aquí: dependen de
`admin-auth` (Fase 6).
