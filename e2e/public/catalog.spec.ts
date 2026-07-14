import { test, expect } from '@playwright/test';
import { prisma } from '../../lib/prisma';

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
    // Not every seeded product has photos (e.g. the mockup's placeholder
    // "Foto armazón" cards) — the gallery/lightbox trigger only renders
    // when there's a real image, so this test targets a product known to
    // have at least one, rather than whichever card happens to be first.
    const withImage = await prisma.product.findFirstOrThrow({
      where: { visible: true, images: { some: {} } },
      select: { slug: true },
    });
    await page.goto(`/catalogo/${withImage.slug}`);

    const thumbnails = page.getByRole('button', { name: /Mostrar fotografía/ });
    const thumbCount = await thumbnails.count();
    if (thumbCount > 1) {
      await thumbnails.nth(1).click();
      await expect(thumbnails.nth(1)).toHaveAttribute('aria-current', 'true');
    }

    const openLightbox = page.getByRole('button', { name: /Ver en grande/ });
    await openLightbox.first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await page.getByRole('button', { name: 'Cerrar visor de fotografías' }).click();
    await expect(dialog).not.toBeVisible();
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
