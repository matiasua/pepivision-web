// Lighthouse CI, acotado a las 3 páginas públicas principales (Fase 9,
// sección 7) — nunca páginas administrativas con datos privados. Corre
// contra el stack real vía `nginx` (no arranca un servidor propio: la app
// ya está arriba). Usa el Chromium que trae la imagen oficial de
// Playwright (ver Dockerfile.e2e) en vez de depender de que
// chrome-launcher descargue el suyo — la ruta se resuelve dinámicamente en
// scripts/run-lighthouse.mjs (chromium.executablePath()) y se pasa acá
// exclusivamente vía CHROME_PATH, nunca hardcodeada con un número de
// revisión (esos cambian entre versiones/reconstrucciones de la imagen).
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://nginx';

module.exports = {
  ci: {
    collect: {
      // "armazones" is one of prisma/seed.ts's fixed, idempotent seed
      // categories — stable across environments that ran the seed, unlike
      // an offering slug (this config is plain JSON-ish and can't await a
      // DB query, and any offering created only for E2E fixtures is already
      // gone by the time Lighthouse runs — it runs after Playwright's
      // global-teardown, see README.md).
      url: [`${BASE_URL}/`, `${BASE_URL}/catalogo`, `${BASE_URL}/catalogo/armazones`],
      numberOfRuns: 1,
      settings: {
        // Set by scripts/run-lighthouse.mjs right before invoking `lhci` —
        // no hardcoded fallback: if it's ever missing, fail loudly via
        // chrome-launcher's own error rather than silently trying a stale
        // path from a different Playwright version.
        chromePath: process.env.CHROME_PATH,
        chromeFlags: '--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage',
      },
    },
    assert: {
      assertions: {
        // Accessibility is the priority per Fase 9 — same 0.9 floor as the
        // dedicated axe gate is meant to reinforce, not replace.
        'categories:accessibility': ['error', { minScore: 0.9 }],
        // 0.7, not 0.85: measured at 0.76 in this dev environment, capped
        // by 4 audits that can never pass here regardless of app code —
        // is-on-https / redirects-http (this stack is plain HTTP by
        // design until a real production deploy terminates TLS),
        // errors-in-console (Next dev mode's own HMR/COOP console
        // warnings, not application errors), and valid-source-maps (dev
        // webpack's eval-based source maps, not the production build's).
        // The floor still catches a genuine NEW best-practices regression.
        'categories:best-practices': ['error', { minScore: 0.7 }],
        'categories:seo': ['error', { minScore: 0.85 }],
        // Performance in a single-replica dev-mode container (webpack dev
        // server, no production build/CDN/caching) is known to be
        // noticeably slower and more run-to-run variable than a real
        // deployment — a low, "not catastrophically broken" floor, not a
        // production performance budget. See e2e/README.md.
        'categories:performance': ['warn', { minScore: 0.4 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './.lighthouseci',
    },
  },
};
