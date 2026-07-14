import { test } from '@playwright/test';
import { expectNoSeriousA11yViolations } from '../fixtures/axe';

const STATIC_PAGES: [string, string][] = [
  ['/', 'home'],
  ['/catalogo', 'catalogo'],
  ['/cotizador', 'cotizador'],
  ['/domicilio', 'domicilio'],
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

test('axe: sin violaciones serious/critical en una ficha de producto', async ({ page }, testInfo) => {
  await page.goto('/catalogo');
  await page.getByRole('link', { name: 'Ver detalles' }).first().click();
  await expectNoSeriousA11yViolations(page, testInfo, 'ficha-producto');
});
