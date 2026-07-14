import { test, expect } from '@playwright/test';
import { prisma } from '../../lib/prisma';
import { readE2eFixtures, uniqueTag } from '../fixtures/test-data';
import { tinyPngBuffer } from '../fixtures/files';
import { loginAsAdmin } from '../fixtures/login';

// Flujos 24-31: crear producto, editar, agregar color sin recargar, subir
// varias fotografías, cambiar portada, reordenar, cambiar color de una
// fotografía.
//
// Flujo 26 del pedido original ("Agregar una marca") no tiene una interfaz
// administrativa correspondiente: `Brand` no tiene una pantalla de alta en
// v1 (ver modules/catalog/README.md y design.md → "Modelo Brand") — las
// marcas se siembran/gestionan directamente en la base de datos. Se
// documenta aquí en vez de simularlo con una funcionalidad inexistente;
// en su lugar, este archivo ejercita "seleccionar una marca activa
// existente" (BrandSelect), que sí es una interacción real del formulario.

let productId = '';

test.afterAll(async () => {
  if (productId) {
    await prisma.product.deleteMany({ where: { id: productId } });
  }
  await prisma.$disconnect();
});

test.describe.serial('Panel admin — CRUD de producto y galería', () => {
  test.beforeEach(async ({ page }) => {
    const { superadmin } = await readE2eFixtures();
    await loginAsAdmin(page, superadmin.email, superadmin.password);
  });

  test('crea un producto de prueba, seleccionando una marca activa existente', async ({ page }) => {
    const tag = uniqueTag('e2eprod');
    await page.goto('/admin/products/new');

    await page.locator('#product-name').fill(`Modelo E2E ${tag}`);
    await page.locator('#product-code').fill(tag);

    await page.getByRole('button', { name: 'Marca *' }).click();
    await page.getByRole('option').first().click();

    await page.locator('#product-price').fill('29990');

    await page.getByRole('button', { name: 'Guardar modelo' }).click();
    await page.waitForURL(/\/admin\/products\/[^/]+\/edit$/);

    productId = page.url().match(/\/admin\/products\/([^/]+)\/edit/)![1];
    const saved = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(saved.code).toBe(tag);
  });

  test('edita el producto recién creado (cambia el precio)', async ({ page }) => {
    test.skip(!productId, 'Depende del test anterior de creación.');
    await page.goto(`/admin/products/${productId}/edit`);

    await page.locator('#product-price').fill('34990');
    await page.getByRole('button', { name: 'Guardar modelo' }).click();
    await page.waitForURL(/\/admin\/products$/);

    const updated = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(updated.priceFromClp).toBe(34990);
  });

  test('agrega un color al producto — visible de inmediato, sin recargar ni volver a entrar', async ({ page }) => {
    test.skip(!productId, 'Depende del test de creación.');
    await page.goto(`/admin/products/${productId}/edit`);

    const colorName = `Color ${uniqueTag('c')}`;
    await page.getByPlaceholder('Nombre del color (ej: Verde militar)').fill(colorName);
    await page.getByRole('button', { name: 'Agregar color' }).click();

    // No page.reload() anywhere in this test — if the color shows up, the
    // update happened purely via the already-loaded page's client state.
    // Appears in more than one place at once (the new color's own tag, the
    // color-selector chip for the photo gallery, etc.) — that's exactly the
    // "reflected immediately, everywhere" behavior this test is proving.
    await expect(page.getByText(colorName).first()).toBeVisible();

    const withColors = await prisma.product.findUniqueOrThrow({ where: { id: productId }, include: { colors: true } });
    expect(withColors.colors.some((c) => c.name === colorName)).toBe(true);
  });

  test('sube varias fotografías, cambia la portada, reordena y cambia el color de una fotografía', async ({ page }) => {
    test.skip(!productId, 'Depende de los tests anteriores.');

    // Guarantee a 2nd color exists (the previous test only added one) so
    // the "cambiar color de foto" step below has somewhere real to move a
    // photo to — added directly via Prisma, equivalent to what the "agrega
    // un color" test already exercises through the UI, without repeating
    // that same UI interaction here.
    let product = await prisma.product.findUniqueOrThrow({ where: { id: productId }, include: { colors: true } });
    if (product.colors.length < 2) {
      await prisma.productColor.create({ data: { productId, name: `Color extra ${uniqueTag('c')}`, hex: '#336699' } });
      product = await prisma.product.findUniqueOrThrow({ where: { id: productId }, include: { colors: true } });
    }

    await page.goto(`/admin/products/${productId}/edit`);

    // Select the first color chip in the gallery manager before uploading.
    await page.getByRole('group', { name: 'Selecciona un color para agregar fotografías' }).getByRole('button').first().click();

    const fileInput = page.locator('input[type="file"][multiple]');
    const png = await tinyPngBuffer();
    await fileInput.setInputFiles([
      { name: 'foto-1.png', mimeType: 'image/png', buffer: png },
      { name: 'foto-2.png', mimeType: 'image/png', buffer: png },
    ]);

    await expect(page.getByRole('button', { name: /Ver en grande, posición/ })).toHaveCount(2, { timeout: 15_000 });

    // Cambiar portada: the 2nd photo becomes cover.
    const makeCoverButtons = page.getByRole('button', { name: '☆ Hacer portada' });
    await makeCoverButtons.first().click();
    await expect(page.getByRole('button', { name: '★ Portada' })).toHaveCount(1);

    // Reordenar: move the (now) 2nd photo before the 1st.
    const beforeReorder = await prisma.productImage.findMany({ where: { productId }, orderBy: { sortOrder: 'asc' } });
    const moveBefore = page.getByRole('button', { name: 'Mover fotografía antes' });
    await moveBefore.last().click();
    // Wait for the reorder server action to actually commit (poll the DB,
    // not a fixed sleep) before the next UI interaction — clicking through
    // a still-in-flight re-render is what made this step flaky.
    await expect
      .poll(async () => {
        const rows = await prisma.productImage.findMany({ where: { productId }, orderBy: { sortOrder: 'asc' } });
        return rows[0]?.id;
      })
      .not.toBe(beforeReorder[0].id);

    // Cambiar color de una fotografía via su menú "Más acciones". Both
    // uploaded photos started under the color selected at line 102 (the
    // first chip) — after this, at least one must belong to a different
    // color.
    const originalColorId = product.colors[0].id;
    await page.getByRole('button', { name: 'Más acciones para esta fotografía' }).first().click();
    await page.getByRole('menuitem', { name: 'Cambiar color' }).click();
    const otherColor = product.colors.find((c) => c.id !== originalColorId)!;
    const swatchButton = page.locator(`button[aria-label="Cambiar color a ${otherColor.name}"]`);
    await swatchButton.waitFor({ state: 'visible' });
    await swatchButton.click();
    await expect
      .poll(async () => {
        const rows = await prisma.productImage.findMany({ where: { productId } });
        return rows.some((row) => row.productColorId !== originalColorId);
      })
      .toBe(true);
  });
});
