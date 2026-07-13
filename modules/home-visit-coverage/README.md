# modules/home-visit-coverage

Implementa `home-visit-coverage`: gestión administrativa de comunas
habilitadas para atención a domicilio (`/admin/home-visits`, Fase 6).

- `schemas.ts` — alta de comuna (con región opcional), activar/desactivar.
- `repository.ts` — acceso a datos vía Prisma (`EnabledComuna`).
- `service.ts` — evita nombres duplicados (comparación insensible a mayúsculas), registra auditoría.

El formulario público de atención a domicilio (`modules/requests`, Fase 5)
ya consulta esta misma tabla (`findActiveComunaByName`) para la validación
de cobertura — los cambios hechos aquí se reflejan ahí sin despliegue.
