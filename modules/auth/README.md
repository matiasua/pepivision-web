# modules/auth

Implementa `admin-auth`: sesiones, usuarios, roles y auditoría (Fase 6).

- `password.ts` — hash/verificación con bcrypt (vía `bcryptjs`).
- `session.ts` — token de sesión, cookie `httpOnly`/`sameSite=lax`/`secure` (en producción).
- `schemas.ts` — validación Zod (login, alta de usuario, reseteo de contraseña, cambio de rol). `loginSchema` recibe un único campo `identifier` (correo **o** nombre de usuario, normalizado a minúsculas) — un solo flujo de autenticación, sin bifurcar por tipo de identificador.
- `repository.ts` — acceso a datos vía Prisma (`AdminUser`, `Session`, `AuditLogEntry`). `findAdminByIdentifier` resuelve el login buscando por `email` o `username` (ambos únicos y normalizados en minúscula al escribirse, por lo que la unicidad es efectivamente case-insensitive).
- `service.ts` — `login`/`logout`, `getCurrentSession`/`requireSession`/`requireRole` (guards de página), gestión de usuarios, y `recordAudit()` — el helper de auditoría que usan el resto de los módulos administrativos (`catalog`, `requests`, `data-rights`, `home-visit-coverage`, `business-settings`).
