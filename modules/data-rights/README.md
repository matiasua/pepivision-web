# modules/data-rights

Implementa la capacidad `data-rights-requests` (ver
`openspec/changes/add-pepi-vision-360-v1/specs/data-rights-requests/spec.md`).

- `schemas.ts` — validación Zod de entrada (incluye el campo honeypot), sin RUT ni adjuntos (minimización de datos).
- `repository.ts` — acceso a datos vía Prisma (`DataRightsRequest`).
- `service.ts` — `submitDataRightsRequest()`: crea el registro con estado inicial `RECEIVED`, calcula `retentionExpiresAt` y notifica al negocio (sin correo de confirmación al cliente, según la especificación).

Transición de estados y sección administrativa (Fase 6): `admin-schemas.ts`
(cambio de estado + nota de resolución, obligatoria al pasar a `RESOLVED`/
`REJECTED`), `admin-repository.ts` y `admin-service.ts` (+ auditoría de cada
cambio de estado).
