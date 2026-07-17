import { test, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { prisma } from '../../lib/prisma';
import { processCategoryImage } from '../../lib/image-processing';
import { buildCategoryStorageKey, buildPublicUrl, deleteObject, uploadObject } from '../../modules/storage/service';
import { tinyPngBuffer } from '../fixtures/files';

// Fase 6: comportamiento público de la tarjeta de categoría con/sin
// imagen. Fixture E2E propia (categoría efímera, nunca lentes-opticos ni
// lentes-de-sol), creada directamente vía Prisma + el mismo pipeline real
// de subida que usa el admin (processCategoryImage/uploadObject), no un
// mock — igual criterio que el fixture de catálogo en global-setup.ts.
let categoryWithImageId = '';
let categoryWithImageSlug = '';
let categoryWithImageStorageKey = '';
let categoryNoImageId = '';
let categoryNoImageSlug = '';

test.beforeAll(async () => {
  const tag = randomBytes(4).toString('hex');

  const withImage = await prisma.category.create({
    data: {
      name: `Categoría E2E con imagen ${tag}`,
      slug: `e2e-cat-img-${tag}`,
      shortDescription: 'Descripción de prueba E2E.',
      active: true,
      visible: true,
      sortOrder: 999,
      capabilities: { requiresColor: true, allowsFrameSelection: true },
    },
  });
  categoryWithImageId = withImage.id;
  categoryWithImageSlug = withImage.slug;

  const buffer = await tinyPngBuffer();
  const processed = await processCategoryImage(buffer);
  const storageKey = buildCategoryStorageKey(withImage.id, processed.extension);
  await uploadObject({ key: storageKey, body: processed.buffer, contentType: processed.contentType });
  categoryWithImageStorageKey = storageKey;
  await prisma.category.update({
    where: { id: withImage.id },
    data: { imagePath: buildPublicUrl(storageKey), imageStorageKey: storageKey },
  });

  const noImage = await prisma.category.create({
    data: {
      name: `Categoría E2E sin imagen ${tag}`,
      slug: `e2e-cat-noimg-${tag}`,
      shortDescription: 'Otra descripción de prueba E2E.',
      active: true,
      visible: true,
      sortOrder: 999,
      capabilities: { requiresColor: true, allowsFrameSelection: true },
    },
  });
  categoryNoImageId = noImage.id;
  categoryNoImageSlug = noImage.slug;
});

test.afterAll(async () => {
  if (categoryWithImageStorageKey) await deleteObject(categoryWithImageStorageKey).catch(() => undefined);
  await prisma.category.deleteMany({ where: { id: { in: [categoryWithImageId, categoryNoImageId].filter(Boolean) } } });
  await prisma.$disconnect();
});

test.describe('Catálogo público — tarjetas de categoría con imagen (Fase 6)', () => {
  test('una categoría con imagen la muestra con alt descriptivo y enlace accesible', async ({ page }) => {
    await page.goto('/catalogo');

    const link = page.getByRole('link', { name: new RegExp(`Categoría E2E con imagen`) });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', `/catalogo/${categoryWithImageSlug}`);

    const image = link.getByRole('img');
    await expect(image).toBeVisible();
    const alt = await image.getAttribute('alt');
    expect(alt).toContain('Categoría E2E con imagen');
    expect(alt?.toLowerCase()).not.toMatch(/\.webp|\.png|\.jpg/); // nunca el nombre del archivo como alt
  });

  test('una categoría sin imagen muestra un fallback coherente, sin <img> rota', async ({ page }) => {
    await page.goto('/catalogo');

    const link = page.getByRole('link', { name: new RegExp(`Categoría E2E sin imagen`) });
    await expect(link).toBeVisible();
    await expect(link.getByRole('img')).toHaveCount(0); // ningún <img> — el fallback es un div vacío, no un <img> roto

    // El enlace sigue siendo funcional pese a no tener imagen.
    await link.click();
    await expect(page).toHaveURL(`/catalogo/${categoryNoImageSlug}`);
  });

  test('responsive: la tarjeta con imagen se ve correctamente en mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/catalogo');
    const link = page.getByRole('link', { name: new RegExp(`Categoría E2E con imagen`) });
    await expect(link).toBeVisible();
    await expect(link.getByRole('img')).toBeVisible();
  });
});
