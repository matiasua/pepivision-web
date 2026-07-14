-- Provisions (or updates) the least-privilege application role used by the
-- `web` service at runtime. Run by the one-shot `db-init` service in
-- compose.yaml, connected as the Postgres bootstrap superuser
-- (POSTGRES_USER) — that superuser is never used by `web` itself, only by
-- `migrate` (DDL) and this script (role/grant management). See design.md
-- -> "Controles de seguridad" (Fase 8, principio de mínimo privilegio).
--
-- This role gets DML only (SELECT/INSERT/UPDATE/DELETE) on the `public`
-- schema, plus USAGE so it can see the schema's objects at all — no
-- CREATE, no DROP, no ALTER, no role-management, no superuser.
--
-- Idempotent: safe to run every time the environment starts, whether the
-- role/grants already exist or not.

SELECT 'CREATE ROLE ' || quote_ident(:'app_user') || ' LOGIN PASSWORD ' || quote_literal(:'app_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'app_user')
\gexec

ALTER ROLE :"app_user" WITH LOGIN PASSWORD :'app_password';

GRANT CONNECT ON DATABASE :"pg_database" TO :"app_user";
GRANT USAGE ON SCHEMA public TO :"app_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"app_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"app_user";

-- Covers tables/sequences created by migrations that run *after* this
-- script (future `migrate` runs), without ever having to re-grant by hand.
ALTER DEFAULT PRIVILEGES FOR ROLE :"pg_owner" IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"pg_owner" IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO :"app_user";
