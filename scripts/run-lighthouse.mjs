#!/usr/bin/env node
// Resolves the Playwright-bundled Chromium binary *dynamically* (never a
// hardcoded `/ms-playwright/chromium-XXXX/...` revision path — that number
// changes across Playwright versions/image rebuilds and silently goes
// stale) and hands it to LHCI via CHROME_PATH, the same env var
// chrome-launcher (used internally by both `lhci` and Lighthouse) already
// looks for. Runs `lhci healthcheck --fatal` before `autorun` so a broken
// Chrome install fails fast with a clear diagnosis instead of a confusing
// mid-audit crash.
import { chromium } from '@playwright/test';
import { accessSync, constants } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const executablePath = chromium.executablePath();

try {
  accessSync(executablePath, constants.X_OK);
} catch {
  console.error(`Lighthouse CI: no se encontró un Chromium ejecutable de Playwright en "${executablePath}".`);
  console.error('Verifica que Dockerfile.e2e instaló los navegadores de Playwright (imagen oficial mcr.microsoft.com/playwright).');
  process.exit(1);
}

console.log(`Lighthouse CI: usando el Chromium de Playwright en ${executablePath}`);

// Only ever adds/overrides CHROME_PATH — every other variable (including
// anything sensitive) passes through untouched and is never logged here.
const childEnv = { ...process.env, CHROME_PATH: executablePath };

const lhciBin = path.join(process.cwd(), 'node_modules', '.bin', 'lhci');

function runLhci(args) {
  const result = spawnSync(lhciBin, args, { env: childEnv, stdio: 'inherit' });
  if (result.error) {
    console.error(`Lighthouse CI: no se pudo ejecutar "${lhciBin} ${args.join(' ')}": ${result.error.message}`);
    process.exit(1);
  }
  return result.status ?? 1;
}

const healthcheckStatus = runLhci(['healthcheck', '--fatal']);
if (healthcheckStatus !== 0) {
  console.error('Lighthouse CI: `lhci healthcheck --fatal` falló — abortando antes de correr autorun.');
  process.exit(healthcheckStatus);
}

const autorunStatus = runLhci(['autorun', '--config=lighthouserc.cjs']);
process.exit(autorunStatus);
