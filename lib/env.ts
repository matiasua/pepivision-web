import { z } from 'zod';

// Centralized, validated environment configuration. Fails fast at startup
// (module load time) with a clear error instead of letting an invalid or
// missing variable surface later as a confusing runtime failure.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  SESSION_SECRET: z.string().min(1, 'SESSION_SECRET no puede estar vacío'),

  // Feature flag: gates every public-facing touchpoint of the home-visit
  // ("Atención a domicilio") feature — route, nav link, home-page promo
  // content — without touching admin tooling or historical data (see
  // openspec/changes/temporarily-disable-home-visit/design.md).
  // Fail-closed by design: the service is DISABLED unless this is the
  // exact string "true". Absent, empty, "false", or any other/invalid
  // value all resolve to disabled — never throws, never silently coerces
  // via `Boolean(...)` (which would treat the string "false" as truthy).
  // z.string().optional() (not z.enum) is deliberate: an enum would reject
  // an invalid value with a startup error instead of failing closed to
  // `false`, which is the whole point of this flag's safety posture.
  HOME_VISIT_ENABLED: z.string().optional().default('false').transform((v) => v === 'true'),

  // Base URL for ABSOLUTE asset URLs inside transactional emails (the
  // logo, mainly) — optional, falls back to APP_URL when unset (see
  // modules/notifications/email/config.ts). Never used to build relative
  // paths: email clients don't resolve those against anything.
  EMAIL_ASSET_BASE_URL: z.string().url().optional(),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL no puede estar vacío'),

  OBJECT_STORAGE_ENDPOINT: z.string().url(),
  OBJECT_STORAGE_REGION: z.string().min(1),
  OBJECT_STORAGE_BUCKET: z.string().min(1),
  OBJECT_STORAGE_ACCESS_KEY: z.string().min(1),
  OBJECT_STORAGE_SECRET_KEY: z.string().min(1),
  OBJECT_STORAGE_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  // Browser-facing base URL for reading uploaded objects — distinct from
  // OBJECT_STORAGE_ENDPOINT (used server-to-server; in development that's
  // `http://minio:9000`, only resolvable on the Docker network, never from
  // a browser on the host). See design.md → "Estrategia de almacenamiento
  // de imágenes".
  OBJECT_STORAGE_PUBLIC_URL: z.string().url(),

  // Separate, non-public bucket for sensitive request attachments
  // (prescriptions) — see modules/storage/private-service.ts. Deliberately
  // has no *_PUBLIC_URL counterpart: nothing ever builds a permanent public
  // URL against it, only short-lived signed URLs generated on demand after
  // an authenticated admin request.
  PRIVATE_OBJECT_STORAGE_BUCKET: z.string().min(1),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  SMTP_FROM: z.string().min(1),
  // TLS posture for the SMTP connection — both default to Mailpit-safe
  // (plaintext, no TLS at all) and must be turned on for any real SMTP
  // provider in production. `secure`=true means TLS from the first byte
  // (typically port 465); `requireTLS`=true forces a STARTTLS upgrade on
  // a plaintext connection (typically port 587) and aborts if the server
  // can't provide it — see modules/notifications/client.ts.
  SMTP_SECURE: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  SMTP_REQUIRE_TLS: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),

  // Optional DKIM signing — all three must be set together to activate
  // (see modules/notifications/client.ts). Left blank in development:
  // Mailpit doesn't validate signatures, and there's no real domain to
  // sign for yet. A production deploy sets these once a real sending
  // domain has a published DKIM public key in DNS.
  DKIM_DOMAIN_NAME: z.string().default(''),
  DKIM_KEY_SELECTOR: z.string().default(''),
  DKIM_PRIVATE_KEY: z.string().default(''),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuración de entorno inválida:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;
