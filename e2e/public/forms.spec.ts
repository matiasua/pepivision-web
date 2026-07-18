import { test, expect } from '@playwright/test';
import { prisma } from '../../lib/prisma';
import { isHomeVisitEnabled } from '../../lib/feature-flags';
import { readE2eFixtures, uniqueTag } from '../fixtures/test-data';
import { tinyPdfBuffer, tinyPngBuffer } from '../fixtures/files';
import { clickWizardChoice } from '../fixtures/wizard';

/** Fase 10: categoría → oferta/asesoría → cristal → tratamientos → opciones adicionales → receta → datos → resumen. */
async function completeAdviceUpToPrescription(page: import('@playwright/test').Page, lensModalityLabel: string) {
  await page.goto('/cotizador');
  await clickWizardChoice(page, 'Lentes ópticos');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await clickWizardChoice(page, 'Necesito asesoría');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await clickWizardChoice(page, lensModalityLabel);
  await page.getByRole('button', { name: 'Continuar' }).click();

  await page.getByRole('button', { name: 'Continuar' }).click(); // tratamientos, opcional
  await page.getByRole('button', { name: 'Continuar' }).click(); // opciones adicionales, opcional
}

// Read once, explicitly, from the same environment this Playwright run
// itself executes in (not guessed, not an accidental default) — the
// home-visit route/form only exist to test when the flag is actually on
// for this run. See openspec/changes/temporarily-disable-home-visit.
const homeVisitEnabled = isHomeVisitEnabled();

// Flujos 11-17: cotizador desde producto, cotización sin/con receta,
// adjunto permitido, atención a domicilio, derechos ARCO, mensajes
// accesibles de éxito/error. Cada test limpia los datos que crea.
const requestIds: string[] = [];
const dataRightsIds: string[] = [];

test.afterAll(async () => {
  await prisma.requestAttachment.deleteMany({ where: { requestId: { in: requestIds } } });
  await prisma.emailLog.deleteMany({ where: { requestId: { in: requestIds } } });
  await prisma.request.deleteMany({ where: { id: { in: requestIds } } });
  await prisma.emailLog.deleteMany({ where: { dataRightsRequestId: { in: dataRightsIds } } });
  await prisma.dataRightsRequest.deleteMany({ where: { id: { in: dataRightsIds } } });
  await prisma.$disconnect();
});

test('abre el cotizador desde la ficha de un producto (modelo pre-seleccionado)', async ({ page }) => {
  await page.goto('/catalogo/lentes-opticos');
  await page.getByRole('link', { name: 'Configurar lentes' }).first().click();
  await page.getByRole('link', { name: 'Cotizar este modelo' }).click();

  await expect(page).toHaveURL(/\/cotizador\?categorySlug=lentes-opticos&offeringId=/);
  await expect(page.getByRole('heading', { name: 'Cotizador de lentes' })).toBeVisible();
  // Con oferta preseleccionada, el wizard arranca directamente en el paso
  // "modelo" (10.4: nunca pide seleccionar de nuevo lo ya conocido).
  await expect(page.getByText('¿Ya tienes un modelo elegido?')).toBeVisible();
});

test('envía una cotización completa SIN receta (flujo de asesoría)', async ({ page }) => {
  const tag = uniqueTag('quote');
  const phone = `+56 9 ${Math.floor(10000000 + Math.random() * 89999999)}`;

  await completeAdviceUpToPrescription(page, 'Monofocal');

  await clickWizardChoice(page, 'No');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await page.locator('#quote-name').fill(`Cliente E2E ${tag}`);
  await page.locator('#quote-phone').fill(phone);
  await page.locator('#quote-email').fill(`${tag}@e2e.test.pepivision360.invalid`);
  await page.getByRole('button', { name: 'Continuar' }).click(); // -> resumen

  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Solicitar cotización' }).click();

  await expect(page.getByRole('heading', { name: '¡Solicitud enviada!' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Continuar por WhatsApp' })).toBeVisible();

  const created = await prisma.request.findFirstOrThrow({ where: { phone, type: 'QUOTE' } });
  requestIds.push(created.id);
  expect(created.hasPrescription).toBe(false);
});

test('envía una cotización CON receta adjunta (PDF permitido) y crea un RequestAttachment', async ({ page }) => {
  const tag = uniqueTag('quote');
  const phone = `+56 9 ${Math.floor(10000000 + Math.random() * 89999999)}`;

  await completeAdviceUpToPrescription(page, 'Bifocal');

  await clickWizardChoice(page, 'Sí');
  await page.getByRole('button', { name: 'Continuar' }).click(); // -> adjunto de receta

  await page.locator('input[type="file"]').setInputFiles({
    name: 'receta.pdf',
    mimeType: 'application/pdf',
    buffer: tinyPdfBuffer(),
  });
  await page.getByRole('button', { name: 'Continuar' }).click();

  await page.locator('#quote-name').fill(`Cliente E2E ${tag}`);
  await page.locator('#quote-phone').fill(phone);
  await page.locator('#quote-email').fill(`${tag}@e2e.test.pepivision360.invalid`);
  await page.getByRole('button', { name: 'Continuar' }).click(); // -> resumen

  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Solicitar cotización' }).click();

  await expect(page.getByRole('heading', { name: '¡Solicitud enviada!' })).toBeVisible();

  const created = await prisma.request.findFirstOrThrow({
    where: { phone, type: 'QUOTE' },
    include: { attachments: true },
  });
  requestIds.push(created.id);
  expect(created.attachments).toHaveLength(1);
  expect(created.attachments[0].mimeType).toBe('application/pdf');
});

test('permite adjuntar una imagen (JPG/PNG) como receta en lugar de un PDF', async ({ page }) => {
  const tag = uniqueTag('quote');
  const phone = `+56 9 ${Math.floor(10000000 + Math.random() * 89999999)}`;

  await completeAdviceUpToPrescription(page, 'Progresivo');

  await clickWizardChoice(page, 'Sí');
  await page.getByRole('button', { name: 'Continuar' }).click(); // -> adjunto de receta

  await page.locator('input[type="file"]').setInputFiles({
    name: 'receta.png',
    mimeType: 'image/png',
    buffer: await tinyPngBuffer(),
  });
  await page.getByRole('button', { name: 'Continuar' }).click();

  await page.locator('#quote-name').fill(`Cliente E2E ${tag}`);
  await page.locator('#quote-phone').fill(phone);
  await page.getByRole('button', { name: 'Continuar' }).click(); // -> resumen

  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Solicitar cotización' }).click();

  await expect(page.getByRole('heading', { name: '¡Solicitud enviada!' })).toBeVisible();

  const created = await prisma.request.findFirstOrThrow({
    where: { phone, type: 'QUOTE' },
    include: { attachments: true },
  });
  requestIds.push(created.id);
  expect(created.attachments[0]?.mimeType).toBe('image/png');
});

// Conditionally *registered* (not skipped) based on the flag actually
// configured for this run — see e2e/public/home-visit-availability.spec.ts
// for the dedicated, always-registered coverage of both the enabled and
// disabled states via a single deterministic branch per test.
if (homeVisitEnabled) {
  test('envía una consulta de atención a domicilio para una comuna habilitada', async ({ page }) => {
    const fixtures = await readE2eFixtures();
    const tag = uniqueTag('domicilio');
    const phone = `+56 9 ${Math.floor(10000000 + Math.random() * 89999999)}`;

    await page.goto('/domicilio');
    await page.locator('#homevisit-name').fill(`Cliente E2E ${tag}`);
    await page.locator('#homevisit-comuna').fill(fixtures.comuna.name);
    await page.locator('#homevisit-phone').fill(phone);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Consultar atención a domicilio' }).click();

    await expect(page.getByRole('heading', { name: '¡Consulta recibida!' })).toBeVisible();

    const created = await prisma.request.findFirstOrThrow({ where: { phone, type: 'HOME_VISIT' } });
    requestIds.push(created.id);
  });
}

test('envía una solicitud de derechos ARCO', async ({ page }) => {
  const tag = uniqueTag('arco');
  const email = `${tag}@e2e.test.pepivision360.invalid`;

  await page.goto('/derechos-arco');
  await page.locator('#arco-name').fill(`Titular E2E ${tag}`);
  await page.locator('#arco-email').fill(email);
  await page.locator('#arco-right-type').selectOption({ label: 'Acceso' });
  await page.locator('#arco-description').fill('Quiero saber qué datos personales tienen registrados sobre mí.');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Enviar solicitud' }).click();

  await expect(page.getByRole('heading', { name: 'Solicitud recibida' })).toBeVisible();

  const created = await prisma.dataRightsRequest.findFirstOrThrow({ where: { email } });
  dataRightsIds.push(created.id);
});

test('el botón de envío del formulario ARCO permanece deshabilitado sin el consentimiento (validación accesible, no solo visual)', async ({
  page,
}) => {
  const tag = uniqueTag('arco');
  await page.goto('/derechos-arco');
  await page.locator('#arco-name').fill(`Titular E2E ${tag}`);
  await page.locator('#arco-email').fill(`${tag}@e2e.test.pepivision360.invalid`);
  await page.locator('#arco-right-type').selectOption({ label: 'Acceso' });
  await page.locator('#arco-description').fill('Descripción de prueba con suficiente longitud.');

  const submit = page.getByRole('button', { name: 'Enviar solicitud' });
  await expect(submit).toBeDisabled();

  await page.getByRole('checkbox').check();
  await expect(submit).toBeEnabled();
});
