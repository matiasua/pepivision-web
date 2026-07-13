# Pepi Visión 360 — entorno de desarrollo local

Este repositorio se desarrolla y ejecuta **exclusivamente dentro de contenedores Docker**. El host de cada desarrollador solo necesita tener instalados **Docker** y **Docker Compose** — no se instala Node.js, PostgreSQL, MinIO ni Nginx localmente, y ningún comando de la aplicación (`npm`, Prisma, lint, tests, build) se ejecuta directamente en el host.

> **Estado actual: solo Fase 1 (Entorno local Docker Compose).** El servicio `web` corre hoy un servidor Node mínimo de bootstrap (`server.js`), no la aplicación Next.js real — eso se construye en la Fase 2 (Fundación técnica). El servicio `migrate` está definido y funcional como job puntual, pero todavía no ejecuta ninguna migración de Prisma real porque `schema.prisma` no existe aún. Ver la sección "Qué queda pendiente" más abajo.

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

Ejemplos (algunos solo tendrán sentido a partir de la Fase 2, cuando exista el proyecto Next.js/Prisma real):

```bash
docker compose exec web npm run lint
docker compose exec web npm run typecheck
docker compose exec web npm test
docker compose run --rm migrate       # ejecuta el job de migraciones
```

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

## Qué queda pendiente (fuera de esta fase)

- El scaffold real de Next.js (App Router, TypeScript estricto, Tailwind) — Fase 2.
- `schema.prisma` y las migraciones reales — Fase 2. Hasta entonces, `npm run migrate` es un placeholder que no simula ninguna migración.
- Lint, typecheck, tests y build reales — hoy son placeholders (`echo ...`) en `package.json`; se implementan a medida que avanzan las fases correspondientes.
- Toda infraestructura productiva (dominio, TLS, despliegue, backups en la nube, etc.) — explícitamente fuera de alcance de este proyecto por ahora; ver `openspec/changes/add-pepi-vision-360-v1/design.md`.
