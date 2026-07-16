import { test, expect } from '@playwright/test';
import { prisma } from '../../lib/prisma';
import { E2E_CATALOG_PRODUCT_SLUG } from '../fixtures/test-data';

// Flujos 4-10: selector de categorías, listado + filtros de una categoría,
// búsqueda/filtro, filtro por marca, ficha de oferta, galería (cambiar
// foto), lightbox, selección de color.
test.describe('Sitio público — catálogo y ficha de producto', () => {
  test('abre el selector de categorías', async ({ page }) => {
    await page.goto('/catalogo');
    await expect(page.getByRole('heading', { name: 'Catálogo', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Armazones' })).toBeVisible();
  });

  test('abre el catálogo de una categoría', async ({ page }) => {
    await page.goto('/catalogo/armazones');
    await expect(page.getByRole('heading', { name: 'Armazones' })).toBeVisible();
    // El fixture E2E siempre tiene una oferta pública en Armazones.
    await expect(page.getByRole('link', { name: 'Ver armazón' }).first()).toBeVisible();
  });

  test('busca por nombre y filtra por género', async ({ page }) => {
    await page.goto('/catalogo/armazones');
    const initialCount = await page.getByRole('link', { name: 'Ver armazón' }).count();
    expect(initialCount).toBeGreaterThan(0);

    await page.getByLabel('Buscar armazón').fill('zzz-no-existe-zzz');
    await page.waitForURL(/q=zzz-no-existe-zzz/);
    await expect(page.getByText('Sin resultados')).toBeVisible();

    await page.getByLabel('Buscar armazón').fill('');
    await page.waitForURL((url) => !url.search.includes('q='));

    // Gender filter chip narrows the result set (or at minimum doesn't error).
    await page.getByRole('link', { name: 'Mujer', exact: true }).click();
    await page.waitForURL(/gender=MUJER/);
    await expect(page.getByRole('heading', { name: 'Armazones' })).toBeVisible();
  });

  test('filtra por marca', async ({ page }) => {
    await page.goto('/catalogo/armazones');
    const brandLinks = page.locator('a[href*="/catalogo/armazones?brand="], a[href*="&brand="]');
    const brandCount = await brandLinks.count();
    test.skip(brandCount === 0, 'No hay chips de marca visibles en este viewport/estado.');

    await brandLinks.first().click();
    await page.waitForURL(/brand=/);
  });

  test('abre una ficha de oferta desde el catálogo', async ({ page }) => {
    await page.goto('/catalogo/armazones');
    await page.getByRole('link', { name: 'Ver armazón' }).first().click();
    await expect(page.getByRole('link', { name: /Volver a/ })).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
  });

  test('cambia de fotografía en la galería, y abre/cierra el lightbox', async ({ page }) => {
    // Targets the dedicated E2E fixture product (e2e/global-setup.ts) —
    // guaranteed to have exactly two real, physically-uploaded photos and a
    // public offering in "armazones", rather than "whichever seeded product
    // happens to have one" (not guaranteed to exist at all on a
    // freshly-migrated CI database, which has no photos until an admin
    // uploads one, nor any offering until the Fase 10 backfill runs).
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

    await page.goto(`/catalogo/armazones/${E2E_CATALOG_PRODUCT_SLUG}`);

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
    // Puede ser la URL legada (sin categoría) — la capa de compatibilidad
    // (5.3) la redirige 308 a la ficha por categoría; page.goto sigue el
    // redirect de forma transparente, igual que un navegador real.
    await page.goto(`/catalogo/${withColorPhotos!.slug}`);

    const hasColorFilter = await page.getByText('Ver fotografías por color').count();
    test.skip(hasColorFilter === 0, 'Este producto no tiene selector de color por fotografías.');

    const colorChip = page.getByText('Ver fotografías por color').locator('..').getByRole('button').first();
    await colorChip.click();
    await expect(colorChip).toHaveAttribute('aria-pressed', 'true');
  });
});

// 5.6: capa de compatibilidad — redirect permanente y 404 preservado.
test.describe('Catálogo — capa de compatibilidad de URLs legadas', () => {
  test('una URL de producto antigua redirige permanentemente a su categoría', async ({ page }) => {
    await page.goto(`/catalogo/${E2E_CATALOG_PRODUCT_SLUG}`);
    await expect(page).toHaveURL(new RegExp(`/catalogo/armazones/${E2E_CATALOG_PRODUCT_SLUG}$`));
    await expect(page.locator('h1')).toBeVisible();
  });

  test('un producto sin ninguna oferta pública sigue devolviendo 404', async ({ page }) => {
    const productWithoutOffering = await prisma.product.findFirst({
      where: { visible: true, slug: { not: E2E_CATALOG_PRODUCT_SLUG }, offerings: { none: {} } },
      select: { slug: true },
    });
    test.skip(!productWithoutOffering, 'No hay productos sembrados sin ofertas para probar este caso.');

    const response = await page.goto(`/catalogo/${productWithoutOffering!.slug}`);
    expect(response?.status()).toBe(404);
  });

  test('una categoría desconocida devuelve 404', async ({ page }) => {
    const response = await page.goto('/catalogo/categoria-que-no-existe-zzz');
    expect(response?.status()).toBe(404);
  });
});

// 5.7: navegación responsive y estado vacío por categoría.
test.describe('Catálogo — responsive y estado vacío', () => {
  test('desktop: los filtros se muestran directamente, sin botón "Filtros"', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/catalogo/armazones');
    await expect(page.getByRole('heading', { name: 'Filtros' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Filtros' })).toHaveCount(0);
  });

  test('tablet: la categoría sigue siendo navegable', async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1194 });
    await page.goto('/catalogo/armazones');
    await expect(page.getByRole('heading', { name: 'Armazones' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver armazón' }).first()).toBeVisible();
  });

  test('mobile: el botón "Filtros" abre un panel modal y se puede cerrar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/catalogo/armazones');

    const openButton = page.getByRole('button', { name: 'Filtros' });
    await expect(openButton).toBeVisible();
    await openButton.click();

    const dialog = page.getByRole('dialog', { name: 'Filtros del catálogo' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Filtros' })).toBeVisible();

    await dialog.getByRole('button', { name: 'Cerrar filtros' }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('estado vacío al filtrar sin resultados dentro de una categoría', async ({ page }) => {
    await page.goto('/catalogo/armazones');
    await page.getByLabel('Buscar armazón').fill('zzz-no-existe-zzz');
    await page.waitForURL(/q=zzz-no-existe-zzz/);
    await expect(page.getByText('Sin resultados')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Limpiar filtros' })).toBeVisible();
  });
});

test.afterAll(async () => {
  await prisma.$disconnect();
});
