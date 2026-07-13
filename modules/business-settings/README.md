# modules/business-settings

Implementa `business-settings`: configuración administrativa de negocio
(`/admin/settings`, Fase 6, `SUPERADMIN` únicamente).

- `schemas.ts` — validación Zod del formulario.
- `repository.ts` — fila única (`id` fijo `"singleton"`) vía Prisma.
- `service.ts` — `getEffectiveBusinessSettings()` (usada por `modules/requests` y `modules/data-rights` para retención y correo de notificación; cae a `lib/site-config.ts`/`lib/business-defaults.ts` si aún no existe la fila real) y `updateBusinessSettings()` (+ auditoría).

**Alcance no cubierto todavía**: el sitio público (`Header`, `Footer`,
`/contacto`, páginas legales) sigue leyendo `lib/site-config.ts` de forma
estática, no esta configuración persistida — ver desviación documentada en
el reporte de la Fase 6.
