import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Separate from vitest.config.ts on purpose: these tests hit the real
// `postgres` and `minio` services from compose.yaml (no mocks), so they
// must run sequentially inside a single worker to avoid two test files
// racing on the same rows/objects, and they need a much longer default
// timeout than the pure-logic unit suite. `npm run test:unit`/`npm test`
// never picks these up because they live outside `tests/` (see
// tests-integration/README.md for the services each file requires).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests-integration/**/*.test.ts'],
    // One worker: integration tests share the same Postgres database and
    // MinIO buckets, and clean up their own rows/objects on teardown —
    // running two files concurrently would let one test's cleanup delete
    // another's in-flight fixtures.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
