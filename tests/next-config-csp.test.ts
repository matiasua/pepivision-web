import { afterEach, describe, expect, it, vi } from 'vitest';

// next.config.ts reads NODE_ENV (and OBJECT_STORAGE_PUBLIC_URL) once at
// module-evaluation time, so each scenario needs a fresh module instance —
// vi.resetModules() plus a dynamic import per test, rather than a single
// top-level import shared across cases. vi.stubEnv (not a direct
// process.env.NODE_ENV assignment) because @types/node types that field
// read-only.
async function loadCsp() {
  const mod = await import('../next.config');
  return mod.buildContentSecurityPolicy();
}

describe('next.config.ts — buildContentSecurityPolicy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('allows unsafe-eval/unsafe-inline for scripts only in development (required by HMR)', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.resetModules();
    const csp = await loadCsp();

    expect(csp).toMatch(/script-src[^;]*'unsafe-eval'/);
    expect(csp).toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  it('never allows unsafe-eval in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    const csp = await loadCsp();

    const scriptSrc = csp.split(';').find((directive) => directive.trim().startsWith('script-src'));
    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).not.toContain('unsafe-eval');
    expect(scriptSrc).not.toContain('unsafe-inline');
    expect(scriptSrc).toContain("'self'");
  });

  it('never uses a wildcard source anywhere in the policy', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    const csp = await loadCsp();

    expect(csp).not.toContain('*');
  });

  it('sets frame-ancestors none and object-src none in both environments', async () => {
    for (const env of ['development', 'production']) {
      vi.stubEnv('NODE_ENV', env);
      vi.resetModules();
      const csp = await loadCsp();
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
    }
  });

  it('only adds the HMR WebSocket origin in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.resetModules();
    const devCsp = await loadCsp();
    expect(devCsp).toContain('ws://localhost:8080');

    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    const prodCsp = await loadCsp();
    expect(prodCsp).not.toContain('ws://localhost:8080');
  });
});

describe('next.config.ts — headers() full security header set (single source of truth)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function loadHeaders() {
    const mod = await import('../next.config');
    const rules = await mod.default.headers!();
    return rules[0].headers;
  }

  it('applies the full header set to every path via a single catch-all rule', async () => {
    const mod = await import('../next.config');
    const rules = await mod.default.headers!();
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe('/:path*');
  });

  it('sets nosniff, DENY framing (belt-and-suspenders with CSP frame-ancestors), and a strict referrer policy', async () => {
    const headers = await loadHeaders();
    const byKey = Object.fromEntries(headers.map((h) => [h.key, h.value]));
    expect(byKey['X-Content-Type-Options']).toBe('nosniff');
    expect(byKey['X-Frame-Options']).toBe('DENY');
    expect(byKey['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
  });

  it('locks down Permissions-Policy (camera/mic/geolocation/payment/usb/FLoC all denied)', async () => {
    const headers = await loadHeaders();
    const byKey = Object.fromEntries(headers.map((h) => [h.key, h.value]));
    for (const feature of ['camera=()', 'microphone=()', 'geolocation=()', 'payment=()', 'usb=()', 'interest-cohort=()']) {
      expect(byKey['Permissions-Policy']).toContain(feature);
    }
  });

  it('sets same-origin COOP/CORP', async () => {
    const headers = await loadHeaders();
    const byKey = Object.fromEntries(headers.map((h) => [h.key, h.value]));
    expect(byKey['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(byKey['Cross-Origin-Resource-Policy']).toBe('same-origin');
  });

  it('never sets Strict-Transport-Security (HSTS would be actively wrong over this dev environment\'s plain HTTP)', async () => {
    const headers = await loadHeaders();
    expect(headers.some((h) => h.key.toLowerCase() === 'strict-transport-security')).toBe(false);
  });
});
