# Tests de integración

Corren contra los servicios **reales** de `compose.yaml` (no hay mocks de
Prisma, del cliente S3 ni de SMTP) — por eso viven fuera de `tests/` y
usan su propio config (`vitest.integration.config.ts`), invocado por:

```bash
docker compose exec web npm run test:integration
```

Requieren el stack ya arriba (`docker compose up -d`): en concreto
`postgres`, `minio` y `mailpit`. No requieren `nginx` (no hacen peticiones
HTTP a la app, solo llaman funciones de `modules/**/service.ts`
directamente) — la cobertura HTTP/browser real vive en `e2e/`.

| Archivo | Servicios que usa |
|---|---|
| `product-crud.test.ts` | PostgreSQL |
| `product-gallery-storage.test.ts` | PostgreSQL, MinIO |
| `quote-requests.test.ts` | PostgreSQL, MinIO (bucket privado), Mailpit |
| `home-visit-and-arco.test.ts` | PostgreSQL, Mailpit |
| `auth-admin.test.ts` | PostgreSQL |
| `settings-and-comunas.test.ts` | PostgreSQL |

## Aislamiento y limpieza

- Cada test genera datos únicos (`uniqueTag()` en `helpers.ts`, basado en
  timestamp + random) — nunca reutiliza un nombre/código/email fijo.
- Cada archivo rastrea los ids que crea y los borra en `afterAll` (nunca
  un `deleteMany` sin filtro por id).
- `BusinessSettings` es una fila singleton compartida con el entorno de
  desarrollo real: `settings-and-comunas.test.ts` guarda su contenido
  original antes de mutarla y lo restaura exactamente al final.
- Los usuarios administradores de prueba usan el dominio
  `@integration.test.pepivision360.invalid`, nunca tocan las 4 cuentas
  reales provisionadas en la Fase 6.
- `fileParallelism: false` (ver `vitest.integration.config.ts`): los
  archivos corren uno a la vez porque comparten la misma base de datos y
  buckets — dos archivos en paralelo podrían pisarse las limpiezas.

## Por qué el login/logout completo no se prueba aquí con cookies reales

`modules/auth/session.ts` usa `cookies()` de `next/headers`, que solo
funciona dentro de una request real de Next.js. `auth-admin.test.ts`
reemplaza únicamente esa llamada por un jar de cookies en memoria (un
shim de borde de framework, documentado, no un mock de lógica de
negocio) para poder ejercer `login()`/`logout()`/`getCurrentSession()`
reales contra Postgres/bcrypt/rate-limit real. El comportamiento
completo con cookies de navegador reales (incluyendo expiración/rol vía
HTTP) se cubre en `e2e/admin/auth.spec.ts` contra el stack completo vía
`nginx`.
