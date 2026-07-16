import { test, expect } from '@playwright/test';
import { isHomeVisitEnabled } from '../../lib/feature-flags';

// Flujos 1-3: home, navegación principal, carrusel de marcas.
test.describe('Sitio público — navegación', () => {
  test('abre la página de inicio', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Pepi Visión 360/i);
  });

  test('la navegación principal expone las secciones del sitio (8, o 7 si atención a domicilio está deshabilitada)', async ({
    page,
  }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Navegación principal' });
    const alwaysPresent = [
      'Inicio',
      'Catálogo',
      'Cotizador',
      'Tipos de cristales',
      'Nosotros',
      'Preguntas frecuentes',
      'Contacto',
    ];
    for (const label of alwaysPresent) {
      await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
    }
    // See e2e/public/home-visit-availability.spec.ts for the dedicated,
    // always-registered coverage of both the presence and absence cases —
    // this test's own concern is the other 7 links, unaffected by the flag.
    if (isHomeVisitEnabled()) {
      await expect(nav.getByRole('link', { name: 'Atención a domicilio', exact: true })).toBeVisible();
    } else {
      await expect(nav.getByRole('link', { name: 'Atención a domicilio', exact: true })).toHaveCount(0);
    }
  });

  test('clicking a nav link navigates to the right page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Catálogo' }).click();
    await expect(page).toHaveURL(/\/catalogo$/);
  });

  test('el carrusel de marcas se muestra en la página de inicio', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Marcas que trabajamos' })).toBeVisible();
  });
});
