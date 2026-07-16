import { afterEach, describe, expect, it, vi } from 'vitest';

// HOME_VISIT_ENABLED is parsed once at module load (lib/env.ts's top-level
// loadEnv()) — vi.resetModules() + a fresh dynamic import is required for
// each scenario to see a different value. process.env is restored in
// afterEach so no test leaks its override into another file.
const ORIGINAL = process.env.HOME_VISIT_ENABLED;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.HOME_VISIT_ENABLED;
  else process.env.HOME_VISIT_ENABLED = ORIGINAL;
  vi.resetModules();
});

async function loadHelper() {
  vi.resetModules();
  const mod = await import('@/lib/feature-flags');
  return mod.isHomeVisitEnabled;
}

describe('lib/feature-flags — isHomeVisitEnabled (helper centralizado, fail-closed)', () => {
  it('defaults to false (disabled) when HOME_VISIT_ENABLED is absent from the environment', async () => {
    delete process.env.HOME_VISIT_ENABLED;
    const isHomeVisitEnabled = await loadHelper();
    expect(isHomeVisitEnabled()).toBe(false);
  });

  it('returns false when HOME_VISIT_ENABLED=false', async () => {
    process.env.HOME_VISIT_ENABLED = 'false';
    const isHomeVisitEnabled = await loadHelper();
    expect(isHomeVisitEnabled()).toBe(false);
  });

  it('returns true when HOME_VISIT_ENABLED=true', async () => {
    process.env.HOME_VISIT_ENABLED = 'true';
    const isHomeVisitEnabled = await loadHelper();
    expect(isHomeVisitEnabled()).toBe(true);
  });

  it('treats an empty string as disabled', async () => {
    process.env.HOME_VISIT_ENABLED = '';
    const isHomeVisitEnabled = await loadHelper();
    expect(isHomeVisitEnabled()).toBe(false);
  });

  it('treats an invalid value as disabled, without throwing at startup (fail-closed)', async () => {
    process.env.HOME_VISIT_ENABLED = 'maybe';
    const isHomeVisitEnabled = await loadHelper();
    expect(isHomeVisitEnabled()).toBe(false);
  });

  it('does not admit "TRUE" (uppercase) — only the exact lowercase string "true" enables the feature', async () => {
    process.env.HOME_VISIT_ENABLED = 'TRUE';
    const isHomeVisitEnabled = await loadHelper();
    expect(isHomeVisitEnabled()).toBe(false);
  });
});
