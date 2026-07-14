import { test, expect } from '@playwright/test';
import { DataRightType, RequestAttachmentType, RequestType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { uploadPrivateObject, deletePrivateObject, buildAttachmentStorageKey } from '../../modules/storage/private-service';
import { readE2eFixtures, uniqueTag } from '../fixtures/test-data';
import { loginAsAdmin } from '../fixtures/login';

// Flujos 32-35: revisar solicitud, cambiar estado, ver/descargar receta
// protegida, eliminar los datos sintéticos creados por el test. Además, el
// ciclo de vida de una solicitud de derechos ARCO (Recibida → En revisión
// → Resuelta con nota) del "Plan de pruebas" de design.md, que no tenía
// cobertura E2E hasta ahora (solo el envío público, en public/forms.spec.ts).
let requestId = '';
let storageKey = '';

test.beforeAll(async () => {
  const tag = uniqueTag('adminreq');
  storageKey = buildAttachmentStorageKey('pdf');
  await uploadPrivateObject({ key: storageKey, body: Buffer.from('%PDF-1.4\n%%EOF'), contentType: 'application/pdf' });

  const now = new Date();
  const request = await prisma.request.create({
    data: {
      type: RequestType.QUOTE,
      name: `Cliente ${tag}`,
      phone: '+56 9 00000000',
      consentAcceptedAt: now,
      retentionExpiresAt: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
      attachments: {
        create: [
          {
            type: RequestAttachmentType.PRESCRIPTION,
            storageKey,
            originalFileName: 'receta.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 20,
          },
        ],
      },
    },
  });
  requestId = request.id;
});

test.afterAll(async () => {
  if (requestId) {
    await prisma.requestAttachment.deleteMany({ where: { requestId } });
    await prisma.request.deleteMany({ where: { id: requestId } });
  }
  if (storageKey) {
    await deletePrivateObject(storageKey).catch(() => undefined);
  }
  await prisma.$disconnect();
});

test('revisa una solicitud, cambia su estado, y visualiza/descarga la receta protegida vía URL firmada', async ({
  page,
  request: apiRequest,
}) => {
  const { superadmin } = await readE2eFixtures();
  await loginAsAdmin(page, superadmin.email, superadmin.password);

  await page.goto('/admin/requests');

  // Scope to THIS fixture's card specifically (by its unique attachment
  // filename) — the dev inbox may contain other, unrelated requests, and
  // `.first()` on a page-wide "Marcar como atendida" button would be
  // order-dependent and flaky.
  const card = page
    .locator('div')
    .filter({ hasText: 'receta.pdf' })
    .filter({ has: page.getByRole('button', { name: /Marcar como/ }) })
    .last();

  await expect(card.getByRole('button', { name: 'Marcar como atendida' })).toBeVisible();
  await card.getByRole('button', { name: 'Marcar como atendida' }).click();
  await expect(card.getByRole('button', { name: 'Marcar como nueva' })).toBeVisible();

  const updated = await prisma.request.findUniqueOrThrow({ where: { id: requestId } });
  expect(updated.status).toBe('HANDLED');

  // The signed URL is built against OBJECT_STORAGE_PUBLIC_URL
  // (http://localhost:9000) — correct for a real end-user's browser, which
  // shares a network with MinIO's published port, but NOT reachable as
  // "localhost" from inside this `e2e` container (a separate network
  // namespace on the Docker network, where MinIO is only reachable as
  // `minio:9000`). Route interception transparently serves the real MinIO
  // response while leaving the visible URL/signature untouched, so the
  // assertions below still verify the real signed-URL contract.
  await page.context().route('http://localhost:9000/**', async (route) => {
    const url = new URL(route.request().url());
    url.hostname = 'minio';
    const response = await route.fetch({ url: url.toString() });
    await route.fulfill({ response });
  });

  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    card.getByRole('button', { name: 'Ver / Descargar' }).click(),
  ]);
  // The app opens the tab blank first (anti-tabnabbing — see
  // components/admin/RequestCard.tsx) and only navigates it to the signed
  // URL once the server action resolves, so the popup's initial URL is
  // "about:blank" — wait for the real navigation, not just "loaded".
  await popup.waitForURL((url) => url.toString() !== 'about:blank', { timeout: 10_000 });
  const signedUrl = popup.url();
  expect(signedUrl).toContain('pepivision360-attachments');
  expect(signedUrl).toMatch(/X-Amz-Signature|Signature=/);
  await popup.close();

  // The signed URL is genuinely usable (not just cosmetically present) —
  // connect to the reachable `minio` host but keep the `Host` header as
  // `localhost:9000` (matching what was actually signed): SigV4 signs the
  // Host header itself, so rewriting the URL's hostname alone would make
  // MinIO recompute a different signature and reject the request.
  const directFetch = await apiRequest.get(signedUrl.replace('localhost:9000', 'minio:9000'), {
    headers: { host: 'localhost:9000' },
  });
  expect(directFetch.status()).toBe(200);

  const attachmentAudit = await prisma.auditLogEntry.findFirst({
    where: { action: 'request.attachment_viewed', targetId: (await prisma.requestAttachment.findFirstOrThrow({ where: { requestId } })).id },
  });
  expect(attachmentAudit).not.toBeNull();

  // Flujo 35: elimina el dato sintético vía la propia UI (ConfirmDeleteButton).
  await card.getByRole('button', { name: 'Eliminar' }).click();
  await card.getByRole('button', { name: 'Sí' }).click();

  await expect(page.getByText(updated.name)).not.toBeVisible();
  const afterDelete = await prisma.request.findUniqueOrThrow({ where: { id: requestId } });
  expect(afterDelete.deletedAt).not.toBeNull(); // soft-delete, per design.md
});

test('mueve una solicitud de derechos ARCO de Recibida a En revisión y luego a Resuelta con nota', async ({ page }) => {
  const tag = uniqueTag('adminarco');
  const now = new Date();
  const dataRightsRequest = await prisma.dataRightsRequest.create({
    data: {
      rightType: DataRightType.ACCESS,
      name: `Titular ${tag}`,
      email: `${tag}@e2e.test.pepivision360.invalid`,
      description: 'Solicito acceso a mis datos personales almacenados.',
      consentAcceptedAt: now,
      retentionExpiresAt: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
    },
  });

  try {
    const { superadmin } = await readE2eFixtures();
    await loginAsAdmin(page, superadmin.email, superadmin.password);

    await page.goto('/admin/requests?tab=arco');
    // DataRightsCard's own root element class combo — specific enough that
    // filtering by it (rather than a bare "div") returns exactly one card
    // per request, not every ancestor container that also happens to
    // contain this request's email.
    const card = page.locator('.rounded-card.p-5\\.5.shadow-brand-sm').filter({ hasText: dataRightsRequest.email });
    await expect(card).toBeVisible();

    await card.getByLabel('Estado').selectOption({ label: 'En revisión' });
    await card.getByRole('button', { name: 'Guardar estado' }).click();
    await expect
      .poll(async () => (await prisma.dataRightsRequest.findUniqueOrThrow({ where: { id: dataRightsRequest.id } })).status)
      .toBe('IN_REVIEW');
    await expect(card.getByLabel('Estado')).toHaveValue('IN_REVIEW');

    await card.getByLabel('Estado').selectOption({ label: 'Resuelta' });
    await card.getByLabel(/Nota de resolución/).fill('Se entregó el detalle de los datos almacenados por correo.');
    await card.getByRole('button', { name: 'Guardar estado' }).click();
    await expect
      .poll(async () => (await prisma.dataRightsRequest.findUniqueOrThrow({ where: { id: dataRightsRequest.id } })).status)
      .toBe('RESOLVED');

    const current = await prisma.dataRightsRequest.findUniqueOrThrow({ where: { id: dataRightsRequest.id } });
    expect(current.status).toBe('RESOLVED');
    expect(current.resolutionNotes).toContain('Se entregó el detalle');
    expect(current.resolvedAt).not.toBeNull();

    const statusAudits = await prisma.auditLogEntry.findMany({
      where: { targetId: dataRightsRequest.id, action: 'data_rights_request.status_changed' },
    });
    expect(statusAudits.length).toBeGreaterThanOrEqual(2);
  } finally {
    await prisma.dataRightsRequest.deleteMany({ where: { id: dataRightsRequest.id } });
  }
});
