import type { NextConfig } from 'next';

// WATCHPACK_POLLING (set in compose.yaml for the `web` service) makes the
// webpack dev server poll for file changes instead of relying on native
// filesystem events, which don't propagate reliably through Docker
// Desktop's bind-mount backend on macOS/Windows (see Fase 1 notes).
// The explicit watchOptions below are a defensive fallback for the same
// reason, in case WATCHPACK_POLLING alone isn't picked up in some setups.
const nextConfig: NextConfig = {
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
