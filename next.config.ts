import type { NextConfig } from 'next';

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
};

export default nextConfig;
