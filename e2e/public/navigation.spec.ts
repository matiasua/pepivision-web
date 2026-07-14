import { test, expect } from '@playwright/test';

// Flujos 1-3: home, navegación principal, carrusel de marcas.
test.describe('Sitio público — navegación', () => {
  test('abre la página de inicio', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Pepi Visión 360/i);
  });

  test('la navegación principal expone las 8 secciones del sitio', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Navegación principal' });
    for (const label of [
      'Inicio',
      'Catálogo',
      'Cotizador',
      'Tipos de cristales',
      'Atención a domicilio',
      'Nosotros',
      'Preguntas frecuentes',
      'Contacto',
    ]) {
      await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
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
