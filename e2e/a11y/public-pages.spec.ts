import { test } from '@playwright/test';
import { expectNoSeriousA11yViolations } from '../fixtures/axe';

const STATIC_PAGES: [string, string][] = [
  ['/', 'home'],
  ['/catalogo', 'catalogo'],
  ['/catalogo/armazones', 'catalogo-categoria'],
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

test('axe: sin violaciones serious/critical en una ficha de oferta', async ({ page }, testInfo) => {
  await page.goto('/catalogo/armazones');
  await page.getByRole('link', { name: 'Ver armazón' }).first().click();
  await expectNoSeriousA11yViolations(page, testInfo, 'ficha-oferta');
});
