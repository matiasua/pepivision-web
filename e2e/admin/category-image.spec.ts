import { test, expect } from '@playwright/test';
import { prisma } from '../../lib/prisma';
import { readE2eFixtures, uniqueTag } from '../fixtures/test-data';
import { tinyPngBuffer } from '../fixtures/files';
import { loginAsAdmin } from '../fixtures/login';

// Fase 6 (redesign-extensible-catalog-v2, design.md → "Imágenes de
// categoría"): administración de la imagen de portada de una Category.
// Fixture propia y exclusiva de E2E (slug único por corrida) — nunca toca
// lentes-opticos ni lentes-de-sol.
let categoryId = '';
let categoryName = '';

test.afterAll(async () => {
  if (categoryId) {
    await prisma.category.deleteMany({ where: { id: categoryId } });
  }
  await prisma.$disconnect();
});

test.describe.serial('Panel admin — imagen de categoría', () => {
  test.beforeEach(async ({ page }) => {
    const { superadmin } = await readE2eFixtures();
    await loginAsAdmin(page, superadmin.email, superadmin.password);
  });

  test('crea una categoría de prueba (sin imagen todavía)', async ({ page }) => {
    categoryName = `Categoría E2E ${uniqueTag('catimg')}`;
    await page.goto('/admin/categories/new');
    await page.getByLabel('Nombre *').fill(categoryName);
    await page.getByRole('button', { name: 'Guardar categoría' }).click();

    // Al crear (a diferencia de editar), CategoryForm navega a la edición
    // de la categoría recién creada, no al listado — ver CategoryForm.tsx.
    await expect(page).toHaveURL(/\/admin\/categories\/[^/]+\/edit$/, { timeout: 15_000 });

    const created = await prisma.category.findFirstOrThrow({ where: { name: categoryName } });
    categoryId = created.id;
    expect(created.imagePath).toBeNull();
  });

  test('sube una imagen, la previsualiza, y la persiste', async ({ page }) => {
    test.skip(!categoryId, 'Depende del test anterior.');
    await page.goto(`/admin/categories/${categoryId}/edit`);

    await expect(page.getByText('Sin imagen')).toBeVisible();

    const fileInput = page.locator('#category-image-input');
    const png = await tinyPngBuffer();
    await fileInput.setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: png });

    await expect(page.getByRole('img', { name: `Imagen actual de la categoría ${categoryName}` })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Eliminar imagen' })).toBeVisible();

    await expect
      .poll(async () => {
        const row = await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });
        return row.imagePath;
      })
      .not.toBeNull();
  });

  test('reemplaza la imagen existente por una nueva', async ({ page }) => {
    test.skip(!categoryId, 'Depende de los tests anteriores.');
    await page.goto(`/admin/categories/${categoryId}/edit`);

    const before = await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });
    test.skip(!before.imageStorageKey, 'Depende de que el test anterior haya subido una imagen.');

    const fileInput = page.locator('#category-image-input');
    const png = await tinyPngBuffer();
    await fileInput.setInputFiles({ name: 'cover-2.png', mimeType: 'image/png', buffer: png });

    await expect
      .poll(async () => {
        const row = await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });
        return row.imageStorageKey;
      })
      .not.toBe(before.imageStorageKey);
  });

  test('rechaza un archivo inválido con un mensaje de error accesible', async ({ page }) => {
    test.skip(!categoryId, 'Depende de los tests anteriores.');
    await page.goto(`/admin/categories/${categoryId}/edit`);

    const fileInput = page.locator('#category-image-input');
    await fileInput.setInputFiles({ name: 'malware.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg></svg>') });

    await expect(page.getByText('Formato de imagen no permitido. Usa JPG o PNG.').first()).toBeVisible();
  });

  test('elimina la imagen de portada', async ({ page }) => {
    test.skip(!categoryId, 'Depende de los tests anteriores.');
    await page.goto(`/admin/categories/${categoryId}/edit`);

    const before = await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });
    test.skip(!before.imageStorageKey, 'Depende de que exista una imagen para eliminar.');

    await page.getByRole('button', { name: 'Eliminar imagen' }).click();
    await page.getByRole('button', { name: 'Sí' }).click();

    await expect(page.getByText('Sin imagen')).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(async () => {
        const row = await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });
        return row.imagePath;
      })
      .toBeNull();
  });
});

// Fuera del describe.serial de arriba — necesita su propia sesión ADMIN
// desde cero (el beforeEach compartido ya deja la página autenticada como
// SUPERADMIN, lo que ocultaría el formulario de login).
test('un ADMIN (no SUPERADMIN) no puede acceder a la administración de categorías', async ({ page }) => {
  const { admin } = await readE2eFixtures();
  await loginAsAdmin(page, admin.email, admin.password);
  await page.goto('/admin/categories');
  await expect(page.getByText('Acceso restringido')).toBeVisible();
});
