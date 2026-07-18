import { test, expect } from '@playwright/test';

// Fase 7 (redesign-extensible-catalog-v2): contenido definitivo de
// /cristales — tres tipos de cristal, tabla comparativa exacta,
// tratamientos y opciones adicionales. No usa fixtures de catálogo ni
// ProductOffering — /cristales es contenido estático, sin dependencia de
// datos sembrados.
test.describe('Sitio público — /cristales (Fase 7)', () => {
  test('la página responde 200 y muestra los tres tipos definitivos', async ({ page }) => {
    const response = await page.goto('/cristales');
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { name: 'Monofocales' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bifocales' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Progresivos' })).toBeVisible();
  });

  test('nunca muestra "Multifocales" como nombre público', async ({ page }) => {
    await page.goto('/cristales');
    await expect(page.getByText('Multifocales', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/multifocal/i)).toHaveCount(0);
  });

  test('la tabla comparativa contiene los cinco criterios y cada intersección tiene el Sí/No correcto', async ({ page }) => {
    await page.goto('/cristales');
    const table = page.getByRole('table');
    await expect(table).toBeVisible();

    const expectedRows: [string, string, string, string][] = [
      ['Una sola distancia de visión', 'Sí', 'No', 'No'],
      ['Lejos y cerca en un mismo cristal', 'No', 'Sí', 'Sí'],
      ['Visión intermedia continua', 'No', 'No', 'Sí'],
      ['Línea divisoria visible', 'No', 'Sí', 'No'],
      ['Transición gradual entre distancias', 'No', 'No', 'Sí'],
    ];

    for (const [feature, mono, bi, progresivo] of expectedRows) {
      const row = table.getByRole('row', { name: new RegExp(feature) });
      await expect(row).toBeVisible();
      const cells = await row.getByRole('cell').allTextContents();
      expect(cells).toEqual([mono, bi, progresivo]);
    }
  });

  test('muestra "Tratamientos principales" con exactamente los seis ítems aprobados', async ({ page }) => {
    await page.goto('/cristales');
    await expect(page.getByRole('heading', { name: 'Tratamientos principales' })).toBeVisible();
    await expect(page.getByText('Antirreflejo')).toBeVisible();
    await expect(page.getByText('Filtro de luz azul-violeta')).toBeVisible();
    await expect(page.getByText('Fotocromático')).toBeVisible();
    await expect(page.getByText('Protección UV')).toBeVisible();
    await expect(page.getByText('Cristales de alto índice')).toBeVisible();
    await expect(page.getByText('Mayor resistencia a rayaduras')).toBeVisible();

    await expect(page.getByText('Tratamiento', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Opción adicional', { exact: true }).first()).toBeVisible();
  });

  test('nunca muestra "Hidrofóbico y oleofóbico" (retirado por decisión comercial)', async ({ page }) => {
    await page.goto('/cristales');
    await expect(page.getByText('Hidrofóbico y oleofóbico')).toHaveCount(0);
    await expect(page.getByText(/hidrof[oó]bico/i)).toHaveCount(0);
  });

  test('muestra "Opciones para lentes de sol" con exactamente sus cuatro ítems — nunca "También disponible"', async ({ page }) => {
    await page.goto('/cristales');
    await expect(page.getByRole('heading', { name: 'Opciones para lentes de sol' })).toBeVisible();
    await expect(page.getByText('También disponible')).toHaveCount(0);

    await expect(page.getByText('Cristales polarizados')).toBeVisible();
    await expect(page.getByText('Cristales degradados')).toBeVisible();
    await expect(page.getByText('Cristales espejados')).toBeVisible();
    await expect(page.getByText('Cristales solares graduados')).toBeVisible();
  });

  test('navegación por teclado: el CTA final es alcanzable y activable con Enter', async ({ page }) => {
    await page.goto('/cristales');
    const cta = page.getByRole('link', { name: 'Cotizar mis cristales' }).last();
    await cta.focus();
    await expect(cta).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/cotizador$/);
  });

  test('responsive móvil: sin scroll horizontal global', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/cristales');
    await expect(page.getByRole('heading', { name: 'Tipos de cristales' })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasHorizontalOverflow).toBe(false);
  });
});
