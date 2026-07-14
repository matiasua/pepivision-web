import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

// Configured for when next/image's built-in optimizer *can* be used
// against this host (see the `unoptimized` note in design.md — in this
// local dev environment it currently can't, because MinIO only ever has
// private-network addresses, which the optimizer refuses to fetch
// regardless of this allowlist). Kept so a genuinely public productive
// object storage endpoint only requires an env var change, not a code
// change, to start using it.
const objectStoragePublicUrl = process.env.OBJECT_STORAGE_PUBLIC_URL
  ? new URL(process.env.OBJECT_STORAGE_PUBLIC_URL)
  : undefined;

// WATCHPACK_POLLING (set in compose.yaml for the `web` service) makes the
// webpack dev server poll for file changes instead of relying on native
// filesystem events, which don't propagate reliably through Docker
// Desktop's bind-mount backend on macOS/Windows (see Fase 1 notes).
// The explicit watchOptions below are a defensive fallback for the same
// reason, in case WATCHPACK_POLLING alone isn't picked up in some setups.
const nextConfig: NextConfig = {
  // Next.js's dev-mode default (`logging.serverFunctions: true`) prints
  // every Server Action's arguments to the terminal — for `loginAction`,
  // that means the plaintext password lands in `docker compose logs web`.
  // Disabled: no admin form (login, password reset, user creation) should
  // ever have its raw input echoed to server logs.
  logging: {
    serverFunctions: false,
  },
  experimental: {
    // Default is 1mb, too small for the 8MB product-photo limit enforced
    // in modules/storage/schemas.ts. 10mb gives that a small margin for
    // multipart/form-data framing overhead without opening the limit up
    // arbitrarily. Keep in sync with nginx/dev.conf's client_max_body_size.
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: objectStoragePublicUrl
      ? [
          {
            protocol: objectStoragePublicUrl.protocol.replace(':', '') as 'http' | 'https',
            hostname: objectStoragePublicUrl.hostname,
            port: objectStoragePublicUrl.port || undefined,
            pathname: '/**',
          },
        ]
      : [],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 300,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  // Single source of truth for security headers (Fase 8) — nginx/dev.conf
  // deliberately only forwards proxy headers and never sets these, to avoid
  // two places disagreeing on the same header. See design.md → "Cabeceras
  // de seguridad" for the full rationale, including why HSTS is absent here
  // (meaningless — and actively wrong to send — over the plain HTTP this
  // dev environment always serves; it belongs at the production reverse
  // proxy once real TLS terminates there).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: buildContentSecurityPolicy() },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Belt-and-suspenders with the CSP's own frame-ancestors 'none'
          // below — X-Frame-Options is what pre-CSP3 browsers still honor.
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
          },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

/**
 * Built once per config load (not per-request — Next.js reads `headers()`
 * per request, but the policy string itself never varies with the request,
 * only with NODE_ENV, so no per-request nonce/state is involved).
 *
 * Dev vs prod split:
 * - `script-src` allows `unsafe-eval`/`unsafe-inline` ONLY in development —
 *   required by webpack's dev-mode React Refresh/HMR runtime, which
 *   `eval()`s module code for fast refresh. Production builds never need
 *   either: Next.js's production script output is entirely external
 *   `<script src="/_next/...">` tags, so `'self'` is enough there.
 * - `style-src` keeps `unsafe-inline` in both environments: several
 *   components use React's inline `style={{...}}` prop (dynamic color
 *   swatches, computed layout values), which is a real, deliberate,
 *   low-risk usage — not worth the complexity of a nonce/hash pipeline for
 *   this app's threat model. Documented as an accepted trade-off in
 *   design.md rather than left implicit.
 * - `connect-src`/`img-src` include the object-storage public origin (MinIO
 *   in dev) so `next/image`'s `unoptimized` `<img>` tags and any
 *   client-side fetch to it aren't blocked; the dev-only HMR WebSocket
 *   origin is added explicitly rather than relying on browsers to treat
 *   `'self'` as covering the `ws:`/`wss:` scheme.
 * - No `unsafe-eval` and no wildcard origins in production, per Fase 8
 *   requirements.
 */
export function buildContentSecurityPolicy(): string {
  const scriptSrc = isProd ? ["'self'"] : ["'self'", "'unsafe-eval'", "'unsafe-inline'"];

  const connectSrc = ["'self'"];
  const imgSrc = ["'self'", 'data:'];
  if (objectStoragePublicUrl) {
    connectSrc.push(objectStoragePublicUrl.origin);
    imgSrc.push(objectStoragePublicUrl.origin);
  }
  if (!isProd) {
    connectSrc.push('ws://localhost:8080', 'ws://127.0.0.1:8080');
  }

  return [
    `default-src 'self'`,
    `script-src ${scriptSrc.join(' ')}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src ${imgSrc.join(' ')}`,
    `font-src 'self'`,
    `connect-src ${connectSrc.join(' ')}`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
  ].join('; ');
}

export default nextConfig;
