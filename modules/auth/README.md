# modules/auth

Implementa `admin-auth`: sesiones, usuarios, roles y auditoría (Fase 6).

- `password.ts` — hash/verificación con bcrypt (vía `bcryptjs`).
- `session.ts` — token de sesión, cookie `httpOnly`/`sameSite=lax`/`secure` (en producción).
- `schemas.ts` — validación Zod (login, alta de usuario, reseteo de contraseña, cambio de rol).
- `repository.ts` — acceso a datos vía Prisma (`AdminUser`, `Session`, `AuditLogEntry`).
- `service.ts` — `login`/`logout`, `getCurrentSession`/`requireSession`/`requireRole` (guards de página), gestión de usuarios, y `recordAudit()` — el helper de auditoría que usan el resto de los módulos administrativos (`catalog`, `requests`, `data-rights`, `home-visit-coverage`, `business-settings`).
