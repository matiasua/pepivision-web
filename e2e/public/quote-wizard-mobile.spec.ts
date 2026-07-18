import { test, expect, type Page } from '@playwright/test';
import { clickWizardChoice } from '../fixtures/wizard';

/**
 * Fase 10 — iteración correctiva de UX: el nav de progreso horizontal
 * recortaba el último rótulo de paso ("Resumen" → "R") en mobile (390px)
 * a partir de 8 pasos activos (hallazgo real de la revisión GUI, ver
 * design.md). Reemplazado por un indicador compacto ("Paso X de Y" +
 * nombre completo del paso + barra de progreso semántica) exclusivo de
 * mobile — este spec confirma, en un navegador real, que ningún rótulo
 * se recorta y que no aparece scroll horizontal en ningún punto del flujo.
 */

const MOBILE_VIEWPORT = { width: 390, height: 844 };

async function assertNoHorizontalOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBe(clientWidth);
}

async function assertCurrentStepLabel(page: Page, label: string) {
  // El indicador compacto solo existe en mobile (`sm:hidden`) — el
  // rótulo del paso activo debe estar completo, nunca recortado. Se
  // busca el texto acotado al contenedor de la barra de progreso (no al
  // documento completo) porque el stepper de escritorio/tablet — oculto
  // por CSS en este viewport, no removido del DOM — repite el mismo
  // rótulo en su propia lista de pasos.
  const progressbar = page.getByRole('progressbar');
  await expect(progressbar).toHaveAttribute('aria-valuetext', new RegExp(`: ${label}$`));
  const compactWrapper = progressbar.locator('..');
  await expect(compactWrapper.getByText(label, { exact: true })).toBeVisible();
}

test.describe('Cotizador — indicador de progreso mobile (390×844)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
  });

  test('flujo óptico: el indicador compacto nunca trunca un rótulo y no hay scroll horizontal', async ({ page }) => {
    await page.goto('/cotizador');
    await assertCurrentStepLabel(page, 'Categoría');
    await assertNoHorizontalOverflow(page);

    await clickWizardChoice(page, 'Lentes ópticos');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await assertCurrentStepLabel(page, 'Modelo');

    await clickWizardChoice(page, 'Necesito asesoría');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await assertCurrentStepLabel(page, 'Cristal');
    await assertNoHorizontalOverflow(page);

    await clickWizardChoice(page, 'Monofocal');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await assertCurrentStepLabel(page, 'Tratamientos');

    await page.getByRole('button', { name: 'Continuar' }).click(); // -> opciones adicionales
    await assertCurrentStepLabel(page, 'Opciones');

    await page.getByRole('button', { name: 'Continuar' }).click(); // -> receta
    await assertCurrentStepLabel(page, 'Receta');

    await clickWizardChoice(page, 'No');
    await page.getByRole('button', { name: 'Continuar' }).click(); // -> datos (sin adjunto)
    await assertCurrentStepLabel(page, 'Datos');
    await assertNoHorizontalOverflow(page);

    await page.getByRole('button', { name: 'Continuar' }).click(); // -> resumen
    await assertCurrentStepLabel(page, 'Resumen');
    await expect(page.getByText('Resumen de tu solicitud')).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test('flujo solar sin graduación: omite receta/adjunto y el total de pasos del indicador baja en consecuencia', async ({
    page,
  }) => {
    await page.goto('/cotizador');
    await clickWizardChoice(page, 'Lentes de sol');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await clickWizardChoice(page, 'Necesito asesoría');
    await page.getByRole('button', { name: 'Continuar' }).click();

    await clickWizardChoice(page, 'Sin graduación');
    const progressbar = page.getByRole('progressbar');
    await expect(progressbar).toHaveAttribute('aria-valuemax', '7');

    await page.getByRole('button', { name: 'Continuar' }).click(); // -> tratamientos
    await page.getByRole('button', { name: 'Continuar' }).click(); // -> opciones
    await page.getByRole('button', { name: 'Continuar' }).click(); // debe saltar receta -> datos
    await assertCurrentStepLabel(page, 'Datos');
    await assertNoHorizontalOverflow(page);

    await page.getByRole('button', { name: 'Continuar' }).click(); // -> resumen
    await assertCurrentStepLabel(page, 'Resumen');
    await assertNoHorizontalOverflow(page);
  });

  test('flujo solar graduado: incluye receta y adjunto, y el indicador sigue sin recortar rótulos', async ({ page }) => {
    await page.goto('/cotizador');
    await clickWizardChoice(page, 'Lentes de sol');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await clickWizardChoice(page, 'Necesito asesoría');
    await page.getByRole('button', { name: 'Continuar' }).click();

    await clickWizardChoice(page, 'Solar progresivo');
    await page.getByRole('button', { name: 'Continuar' }).click(); // -> tratamientos
    await page.getByRole('button', { name: 'Continuar' }).click(); // -> opciones
    await page.getByRole('button', { name: 'Continuar' }).click(); // -> receta
    await assertCurrentStepLabel(page, 'Receta');

    await clickWizardChoice(page, 'Sí');
    await page.getByRole('button', { name: 'Continuar' }).click(); // -> adjunto
    await assertCurrentStepLabel(page, 'Adjunto');
    await assertNoHorizontalOverflow(page);

    await page.getByRole('button', { name: 'Continuar' }).click(); // -> datos
    await page.getByRole('button', { name: 'Continuar' }).click(); // -> resumen
    await assertCurrentStepLabel(page, 'Resumen');
    await assertNoHorizontalOverflow(page);
  });

  test('teclado: seleccionar una categoría con el teclado habilita "Continuar" sin avanzar de paso solo', async ({ page }) => {
    await page.goto('/cotizador');
    const continueButton = page.getByRole('button', { name: 'Continuar' });
    await expect(continueButton).toBeDisabled();

    await page.getByRole('radio', { name: 'Lentes ópticos', exact: true }).focus();
    await page.keyboard.press('Space');
    await expect(continueButton).toBeEnabled();
    await assertCurrentStepLabel(page, 'Categoría'); // sigue en el paso de categoría — no avanzó solo

    await continueButton.focus();
    await page.keyboard.press('Enter');
    await assertCurrentStepLabel(page, 'Modelo');
  });
});
