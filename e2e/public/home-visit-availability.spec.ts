import { test, expect } from '@playwright/test';
import { isHomeVisitEnabled } from '../../lib/feature-flags';

// Read once, explicitly, from the same environment this Playwright run
// itself executes in — HOME_VISIT_ENABLED is a server-side env var parsed
// once at container boot (lib/env.ts), so a single test process cannot
// toggle it mid-run. Achieving coverage of BOTH states means running this
// suite twice, once per container configuration (the same way any other
// build-time/boot-time flag is validated in CI) — this file always
// registers the assertions matching whichever state is actually running,
// deterministically, rather than silently skipping based on an unchecked
// assumption. See openspec/changes/temporarily-disable-home-visit/design.md.
const homeVisitEnabled = isHomeVisitEnabled();

test.describe(`Disponibilidad pública de atención a domicilio (HOME_VISIT_ENABLED=${homeVisitEnabled})`, () => {
  test('la ruta /domicilio responde según el estado del flag', async ({ page }) => {
    const response = await page.goto('/domicilio');
    if (homeVisitEnabled) {
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { name: 'Atención a domicilio' })).toBeVisible();
    } else {
      expect(response?.status()).toBe(404);
    }
  });

  test('el enlace de navegación aparece u omite según el estado del flag (escritorio y móvil)', async ({ page }) => {
    await page.goto('/');

    const desktopNav = page.getByRole('navigation', { name: 'Navegación principal' });
    if (homeVisitEnabled) {
      await expect(desktopNav.getByRole('link', { name: 'Atención a domicilio', exact: true })).toBeVisible();
    } else {
      await expect(desktopNav.getByRole('link', { name: 'Atención a domicilio', exact: true })).toHaveCount(0);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    const mobileNav = page.getByRole('navigation', { name: 'Navegación móvil' });
    if (homeVisitEnabled) {
      await expect(mobileNav.getByRole('link', { name: 'Atención a domicilio', exact: true })).toBeVisible();
    } else {
      await expect(mobileNav.getByRole('link', { name: 'Atención a domicilio', exact: true })).toHaveCount(0);
    }
  });

  test('el footer omite el enlace cuando el flag está deshabilitado', async ({ page }) => {
    await page.goto('/');
    const footer = page.getByRole('contentinfo');
    if (homeVisitEnabled) {
      await expect(footer.getByRole('link', { name: 'Atención a domicilio', exact: true })).toBeVisible();
    } else {
      await expect(footer.getByRole('link', { name: 'Atención a domicilio', exact: true })).toHaveCount(0);
    }
  });

  test('la tarjeta de beneficio y el badge flotante del inicio aparecen u omiten según el estado del flag', async ({
    page,
  }) => {
    await page.goto('/');
    if (homeVisitEnabled) {
      await expect(page.getByText('Servicio a domicilio', { exact: true })).toBeVisible();
      await expect(page.getByText('A domicilio', { exact: true })).toBeVisible();
    } else {
      await expect(page.getByText('Servicio a domicilio', { exact: true })).toHaveCount(0);
      await expect(page.getByText('A domicilio', { exact: true })).toHaveCount(0);
    }
  });

  test('la entrada de FAQ sobre atención a domicilio aparece u omite según el estado del flag', async ({ page }) => {
    await page.goto('/faq');
    const entry = page.getByRole('button', { name: '¿Realizan atención a domicilio?' });
    if (homeVisitEnabled) {
      await expect(entry).toBeVisible();
    } else {
      await expect(entry).toHaveCount(0);
    }
  });

  if (!homeVisitEnabled) {
    test('un envío directo a la Server Action no puede completarse mediante la UI, ya que el formulario nunca se renderiza', async ({
      page,
    }) => {
      const response = await page.goto('/domicilio');
      expect(response?.status()).toBe(404);
      await expect(page.locator('#homevisit-name')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Consultar atención a domicilio' })).toHaveCount(0);
    });
  }
});
