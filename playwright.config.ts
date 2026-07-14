import { defineConfig, devices } from '@playwright/test';

// Real stack only — no mocks. Defaults to the internal Docker network
// hostname (`nginx`, reachable from the `e2e` compose service/CI
// container); override with PLAYWRIGHT_BASE_URL to point at
// http://localhost:8080 when running from a host machine that already has
// `docker compose up` running.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://nginx';
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // shares one Postgres/MinIO/Mailpit with no per-worker isolation — see e2e/README.md
  workers: 1,
  retries: isCI ? 1 : 0, // limited, not "hide flakiness" — a genuinely broken assertion still fails after 1 retry
  timeout: 45_000,
  // 10s (not the Playwright default of 5s): Next.js dev mode compiles each
  // route on-demand on its first hit in a run, which can add several
  // seconds before the very first render of a route nobody has visited
  // yet — a dev-mode-only characteristic (see e2e/README.md), not present
  // in a production build.
  expect: { timeout: 10_000 },
  reporter: isCI ? [['html', { open: 'never' }], ['github']] : [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'e2e',
      testDir: './e2e',
      testIgnore: ['**/a11y/**'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'a11y',
      testDir: './e2e/a11y',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
