import { test, expect } from '@playwright/test';
import { expectNoSeriousA11yViolations } from '../fixtures/axe';
import { isHomeVisitEnabled } from '../../lib/feature-flags';

// /domicilio is handled separately below (its expected status code depends
// on HOME_VISIT_ENABLED) rather than through this generic always-200 loop.
const STATIC_PAGES: [string, string][] = [
  ['/', 'home'],
  ['/catalogo', 'catalogo'],
  ['/catalogo/armazones', 'catalogo-categoria'],
  ['/cotizador', 'cotizador'],
  ['/derechos-arco', 'derechos-arco'],
  ['/faq', 'faq'],
  ['/contacto', 'contacto'],
  ['/privacidad', 'privacidad'],
  ['/terminos', 'terminos'],
];

for (const [path, label] of STATIC_PAGES) {
  test(`axe: sin violaciones serious/critical en ${path}`, async ({ page }, testInfo) => {
    await page.goto(path);
    await expectNoSeriousA11yViolations(page, testInfo, label);
  });
}

// Read once, explicitly — see e2e/public/home-visit-availability.spec.ts
// for why this can't be toggled mid-run, and openspec/changes/
// temporarily-disable-home-visit/design.md for the feature itself.
const homeVisitEnabled = isHomeVisitEnabled();

test(`axe: /domicilio responde ${homeVisitEnabled ? '200 y el formulario es accesible' : '404 y la página de no-encontrado es accesible'}`, async ({
  page,
}, testInfo) => {
  const response = await page.goto('/domicilio');
  expect(response?.status()).toBe(homeVisitEnabled ? 200 : 404);
  // Either way — the real form, or the not-found fallback — whatever
  // actually rendered must still be free of serious/critical violations.
  await expectNoSeriousA11yViolations(page, testInfo, 'domicilio');
});

test('axe: sin violaciones serious/critical en una ficha de oferta', async ({ page }, testInfo) => {
  await page.goto('/catalogo/armazones');
  await page.getByRole('link', { name: 'Ver armazón' }).first().click();
  await expectNoSeriousA11yViolations(page, testInfo, 'ficha-oferta');
});
