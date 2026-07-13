# modules/data-rights

Implementa la capacidad `data-rights-requests` (ver
`openspec/changes/add-pepi-vision-360-v1/specs/data-rights-requests/spec.md`):
persistencia de solicitudes de derechos ARCO, notificación al negocio y
flujo de estados. Se implementa en la Fase 5 (Formularios y solicitudes).

- `schemas/` — validación Zod de entrada/salida.
- `repository/` — acceso a datos vía Prisma (`DataRightsRequest`).
- `service/` — reglas de negocio (creación, transición de estados, cálculo de retención).
