# Pepi Visión 360 — entorno de desarrollo local

Este repositorio se desarrolla y ejecuta **exclusivamente dentro de contenedores Docker**. El host de cada desarrollador solo necesita tener instalados **Docker** y **Docker Compose** — no se instala Node.js, PostgreSQL, MinIO ni Nginx localmente, y ningún comando de la aplicación (`npm`, Prisma, lint, tests, build) se ejecuta directamente en el host.

> **Estado actual: `add-pepi-vision-360-v1` completado, validado y archivado con 100/100 tareas**. Incluye sitio público, catálogo, solicitudes, autenticación y administración, almacenamiento de imágenes, seguridad, auditoría, accesibilidad y pruebas/CI. La infraestructura productiva permanece deliberadamente fuera de alcance; consulta `openspec/changes/archive/2026-07-14-add-pepi-vision-360-v1/design.md`.

## Prerrequisitos

- Docker
- Docker Compose (plugin `docker compose`, no el binario standalone `docker-compose`)

Nada más. No se requiere Node, npm, Prisma CLI, PostgreSQL, MinIO ni Nginx instalados en el host.

## Levantar el entorno

```bash
cp .env.example .env   # completa los valores (ver comentarios en el archivo)
docker compose up --build
```

Esto construye la imagen de `web` y levanta: `web`, `postgres`, `migrate` (se ejecuta una vez y termina), `minio`, `minio-init` (se ejecuta una vez y termina), `mailpit` y `nginx`.

Una vez arriba, la aplicación (hoy, la página de bootstrap de la Fase 1) queda disponible en:

```
http://localhost:8080
```

Para verificar que la configuración de Compose es válida sin levantar nada:

```bash
docker compose config
```

Para bajar el entorno (los datos de `postgres` y `minio` se conservan mientras no uses `-v`):

```bash
docker compose down
```

## Servicios y puertos

Todo lo que no es el punto de entrada público (`nginx`) se publica únicamente en `127.0.0.1`, nunca en `0.0.0.0` ni en la red local. `web` no publica ningún puerto al host: solo es alcanzable por `nginx`, dentro de la red interna de Docker.

| Servicio | Rol | Puerto en el host |
|---|---|---|
| `nginx` | Reverse proxy local, punto de entrada único | `127.0.0.1:8080` |
| `web` | Aplicación (Next.js en Fase 2; bootstrap Node en Fase 1) | *(ninguno — solo interno, puerto `3000`)* |
| `postgres` | Base de datos | `127.0.0.1:5432` |
| `minio` | Almacenamiento de objetos (API S3-compatible) | `127.0.0.1:9000` (API), `127.0.0.1:9001` (consola web) |
| `mailpit` | SMTP local para desarrollo | `127.0.0.1:1025` (SMTP), `127.0.0.1:8025` (interfaz web) |
| `adminer` *(opcional)* | Explorador de base de datos | `127.0.0.1:8081` |

`migrate` y `minio-init` son jobs puntuales: corren, hacen su trabajo, y terminan (verás `Exited (0)` en `docker compose ps` — es el comportamiento esperado, no un error).

## Ejecutar comandos de la aplicación

Nunca directamente en el host. Usa siempre uno de estos dos patrones:

```bash
# Contra un contenedor que ya está corriendo:
docker compose exec web <comando>

# Ejecución puntual, sin depender de que el contenedor ya esté arriba:
docker compose run --rm web <comando>
```

Ejemplos:

```bash
docker compose exec web npm run lint
docker compose exec web npm run typecheck
docker compose exec web npm test              # alias de test:unit
docker compose run --rm migrate               # ejecuta el job de migraciones
docker compose exec web npx prisma db seed    # datos de ejemplo (productos, marcas, comunas)
```

Ver la sección **Pruebas** más abajo para unitarias, integración, E2E, accesibilidad automatizada y Lighthouse.

## Adminer (opcional)

`adminer` **no** se levanta con `docker compose up --build` — solo con su profile explícito:

```bash
docker compose --profile tools up -d adminer
```

## Persistencia de datos

`postgres` y `minio` usan volúmenes nombrados (`postgres_data`, `minio_data`). Reiniciar contenedores o correr `docker compose down` (sin `-v`) **no borra los datos**. Para empezar desde cero:

```bash
docker compose down -v
```

## Pruebas

Todos los comandos corren dentro de Docker Compose — nunca `npm install`/`npm run` directo en el host.

| Suite | Comando | Requiere |
|---|---|---|
| Lint | `docker compose exec web npm run lint` | solo `web` |
| Typecheck | `docker compose exec web npm run typecheck` | solo `web` |
| Unitarias/componentes | `docker compose exec web npm run test:unit` (= `npm test`) | solo `web` |
| Integración | `docker compose exec web npm run test:integration` | `web` + `postgres` + `minio` + `mailpit` |
| Build (producción) | `docker compose exec web npm run build` | solo `web` |
| E2E (Playwright, flujos funcionales) | `docker compose --profile e2e run --rm e2e npm run test:e2e` | stack completo (`nginx`) |
| Accesibilidad automatizada (axe-core) | `docker compose --profile e2e run --rm e2e npm run test:a11y` | stack completo (`nginx`) |
| Lighthouse CI (home, catálogo, ficha de producto) | `docker compose --profile e2e run --rm e2e npm run test:lighthouse` | stack completo (`nginx`) |
| Todo lo anterior salvo E2E/a11y/Lighthouse | `docker compose exec web npm run ci` | `web` + `postgres` + `minio` + `mailpit` |

Los tests de integración viven en `tests-integration/` (no en `tests/`, que solo cubre unitarias/componentes) — ver `tests-integration/README.md` para el detalle de qué servicio requiere cada archivo y cómo se aíslan/limpian los datos que crean.

### Playwright (E2E + axe): primera vez

El servicio `e2e` (perfil `e2e`, nunca se levanta con un `docker compose up` normal) usa una imagen aparte (`Dockerfile.e2e`, basada en la imagen oficial de Playwright — trae los navegadores ya instalados, nunca se instalan en el host). Antes de la primera corrida, o después de cambiar `package.json`:

```bash
docker compose --profile e2e build e2e
docker compose --profile e2e run --rm e2e npm install   # rellena el volumen e2e_node_modules
```

Luego, con el stack principal arriba (`docker compose up -d`):

```bash
docker compose --profile e2e run --rm e2e npx playwright test   # e2e + a11y juntos
```

`e2e/global-setup.ts` crea usuarios administradores de prueba (un `SUPERADMIN` y un `ADMIN`, contraseña generada al azar en cada corrida) y una comuna habilitada de prueba directamente vía Prisma — nunca credenciales fijas ni versionadas — y `e2e/global-teardown.ts` los elimina al terminar (éxito o falla). Los formularios públicos (cotizador, domicilio, ARCO) crean sus propias solicitudes de prueba, con datos únicos por corrida, y cada spec las limpia en su propio `afterAll`.

**Rate limiting**: correr la suite completa varias veces seguidas en pocos minutos puede activar el límite de envíos de los formularios públicos (5 cada 15 min por IP — ver Fase 8). Es el comportamiento esperado, no un bug; `docker compose restart web` reinicia el contador (vive en memoria).

### Revisar Mailpit y MinIO durante/después de las pruebas

- Mailpit (bandeja de correos capturados): http://localhost:8025
- Consola de MinIO (buckets `pepivision360-products` y `pepivision360-attachments`): http://localhost:9001

### Reportes y limpieza

- Reporte HTML de Playwright: `playwright-report/index.html` (abrir en el navegador del host — el volumen se monta desde el contenedor `e2e`).
- Trazas/capturas/videos de fallas: `test-results/` (solo se conservan en fallas, ver `playwright.config.ts`).
- Reportes de Lighthouse: `.lighthouseci/*.report.json` (piloto de assertions definido en `lighthouserc.cjs`).
- Ambos directorios (más `blob-report/`) están en `.gitignore` — seguros de borrar en cualquier momento (`rm -rf playwright-report test-results .lighthouseci`).
- Los datos sintéticos de integración/E2E se autolimpian (`afterAll`/`global-teardown.ts`); si una corrida se interrumpe a mitad de camino, buscar por el dominio `@integration.test.pepivision360.invalid` / `@e2e.test.pepivision360.invalid` o el prefijo `e2e_`/`it_` en nombres/códigos para limpiar manualmente.

### Reproducir el workflow de CI localmente

`.github/workflows/ci.yml` no hace nada que no puedas correr vos mismo con Docker Compose — no instala Node en el runner, no usa AWS ni Terraform, no publica imágenes ni despliega nada. Para reproducirlo paso a paso: `docker compose config` → `docker compose up -d` → esperar que `web` esté `healthy` → `npx prisma db seed` → lint → typecheck → `test:unit` → `test:integration` → `build` → Playwright (`e2e`+`a11y`) → `test:lighthouse` → `npm audit --omit=dev` → `openspec validate --specs --strict` (baseline V1 archivada) → `openspec validate redesign-extensible-catalog-v2 --strict` (cambio activo) — ambos vía `npx --yes @fission-ai/openspec@latest` dentro del contenedor `web` — → confirmar que `design-reference/` no cambió.

## Qué queda fuera de alcance (Fase 10)

Toda infraestructura productiva —dominio, TLS, despliegue, base de datos gestionada, object storage, backups productivos y pipelines de despliegue— permanece explícitamente fuera del alcance de esta versión. Se abordará mediante una propuesta OpenSpec separada. Consulta `openspec/changes/archive/2026-07-14-add-pepi-vision-360-v1/design.md`.
