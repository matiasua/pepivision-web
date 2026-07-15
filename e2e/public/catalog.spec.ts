import { test, expect } from '@playwright/test';
import { prisma } from '../../lib/prisma';
import { E2E_CATALOG_PRODUCT_SLUG } from '../fixtures/test-data';

// Flujos 4-10: catálogo, búsqueda/filtro, filtro por marca, ficha de
// producto, galería (cambiar foto), lightbox, selección de color.
test.describe('Sitio público — catálogo y ficha de producto', () => {
  test('abre el catálogo', async ({ page }) => {
    await page.goto('/catalogo');
    await expect(page.getByRole('heading', { name: 'Catálogo de armazones' })).toBeVisible();
    // At least the dev seed's products should render.
    await expect(page.getByRole('link', { name: 'Ver detalles' }).first()).toBeVisible();
  });

  test('busca por nombre y filtra por género', async ({ page }) => {
    await page.goto('/catalogo');
    const initialCount = await page.getByRole('link', { name: 'Ver detalles' }).count();
    expect(initialCount).toBeGreaterThan(0);

    await page.getByLabel('Buscar armazón').fill('zzz-no-existe-zzz');
    await page.waitForURL(/q=zzz-no-existe-zzz/);
    await expect(page.getByText('Sin resultados')).toBeVisible();

    await page.getByLabel('Buscar armazón').fill('');
    await page.waitForURL((url) => !url.search.includes('q='));

    // Gender filter chip narrows the result set (or at minimum doesn't error).
    await page.getByRole('link', { name: 'Mujer', exact: true }).click();
    await page.waitForURL(/gender=MUJER/);
    await expect(page.getByRole('heading', { name: 'Catálogo de armazones' })).toBeVisible();
  });

  test('filtra por marca', async ({ page }) => {
    await page.goto('/catalogo');
    const brandLinks = page.locator('a[href*="/catalogo?brand="], a[href*="&brand="]');
    const brandCount = await brandLinks.count();
    test.skip(brandCount === 0, 'No hay chips de marca visibles en este viewport/estado.');

    await brandLinks.first().click();
    await page.waitForURL(/brand=/);
  });

  test('abre una ficha de producto desde el catálogo', async ({ page }) => {
    await page.goto('/catalogo');
    await page.getByRole('link', { name: 'Ver detalles' }).first().click();
    await expect(page.getByRole('link', { name: 'Volver al catálogo' })).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
  });

  test('cambia de fotografía en la galería, y abre/cierra el lightbox', async ({ page }) => {
    // Targets the dedicated E2E fixture product (e2e/global-setup.ts) —
    // guaranteed to have exactly two real, physically-uploaded photos,
    // rather than "whichever seeded product happens to have one" (not
    // guaranteed to exist at all on a freshly-migrated CI database, which
    // has no photos until an admin uploads one).
    //
    // The fixture's photos are real MinIO objects at OBJECT_STORAGE_PUBLIC_URL
    // (http://localhost:9000) — correct for a real end-user's browser, but
    // not reachable as "localhost" from inside this `e2e` container (a
    // separate network namespace from MinIO, which is only reachable here
    // as `minio:9000`). Route interception transparently serves the real
    // MinIO response while leaving the visible URL untouched, so the
    // photos actually render instead of failing to load.
    await page.context().route('http://localhost:9000/**', async (route) => {
      const url = new URL(route.request().url());
      url.hostname = 'minio';
      const response = await route.fetch({ url: url.toString() });
      await route.fulfill({ response });
    });

    await page.goto(`/catalogo/${E2E_CATALOG_PRODUCT_SLUG}`);

    // 1-2: la ficha del producto fixture abre y su portada está visible.
    const coverButton = page.getByRole('button', { name: /Ver en grande/ });
    await expect(coverButton).toBeVisible();

    // 3: existe una segunda miniatura (el fixture siembra exactamente 2 fotos).
    const thumbnails = page.getByRole('button', { name: /Mostrar fotografía/ });
    await expect(thumbnails).toHaveCount(2);

    // 4: cambia de fotografía — la miniatura clickeada pasa a ser la actual.
    await thumbnails.nth(1).click();
    await expect(thumbnails.nth(1)).toHaveAttribute('aria-current', 'true');
    await expect(thumbnails.nth(0)).toHaveAttribute('aria-current', 'false');

    // 5-6: abre el lightbox; semántica de diálogo modal y contenido visible.
    await coverButton.click();
    const dialog = page.getByRole('dialog', { name: /Fotografías de/ });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog.getByRole('img').first()).toBeVisible();

    // 7: cierra mediante el botón.
    const closeButton = page.getByRole('button', { name: 'Cerrar visor de fotografías' });
    await closeButton.click();
    await expect(dialog).not.toBeVisible();

    // 9 (primera vuelta): el foco vuelve al control que abrió el visor.
    await expect(coverButton).toBeFocused();

    // 8: vuelve a abrir y cierra con Escape (el componente sí lo soporta —
    // ver components/catalog/GalleryLightbox.tsx).
    await coverButton.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();

    // 9 (segunda vuelta): el foco vuelve a devolverse tras cerrar con Escape.
    await expect(coverButton).toBeFocused();
  });

  test('selecciona un color y la galería filtra sus fotografías', async ({ page }) => {
    const withColorPhotos = await prisma.product.findFirst({
      where: { visible: true, images: { some: {} }, colors: { some: {} } },
      select: { slug: true },
    });
    test.skip(!withColorPhotos, 'Ningún producto sembrado tiene fotografías asociadas a color.');
    await page.goto(`/catalogo/${withColorPhotos!.slug}`);

    const hasColorFilter = await page.getByText('Ver fotografías por color').count();
    test.skip(hasColorFilter === 0, 'Este producto no tiene selector de color por fotografías.');

    const colorChip = page.getByText('Ver fotografías por color').locator('..').getByRole('button').first();
    await colorChip.click();
    await expect(colorChip).toHaveAttribute('aria-pressed', 'true');
  });
});

test.afterAll(async () => {
  await prisma.$disconnect();
});
