import { test } from '@playwright/test';
import { Gender, ProductMaterial, ProductShape } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { readE2eFixtures, uniqueTag } from '../fixtures/test-data';
import { loginAsAdmin } from '../fixtures/login';
import { expectNoSeriousA11yViolations } from '../fixtures/axe';

let scratchProductId = '';

test.beforeAll(async () => {
  const brand = await prisma.brand.findFirstOrThrow({ where: { active: true } });
  const anyAdmin = await prisma.adminUser.findFirstOrThrow();
  const tag = uniqueTag('a11yprod');
  const product = await prisma.product.create({
    data: {
      name: `Modelo A11y ${tag}`,
      code: tag,
      slug: tag,
      brandId: brand.id,
      priceFromClp: 19990,
      gender: Gender.UNISEX,
      shape: ProductShape.REDONDO,
      material: ProductMaterial.ACETATO,
      createdById: anyAdmin.id,
      updatedById: anyAdmin.id,
    },
  });
  scratchProductId = product.id;
});

test.afterAll(async () => {
  if (scratchProductId) {
    await prisma.product.deleteMany({ where: { id: scratchProductId } });
  }
  await prisma.$disconnect();
});

test('axe: formulario de login (/admin, sin sesión)', async ({ page }, testInfo) => {
  await page.goto('/admin');
  await expectNoSeriousA11yViolations(page, testInfo, 'admin-login');
});

test.describe('con sesión SUPERADMIN', () => {
  test.beforeEach(async ({ page }) => {
    const { superadmin } = await readE2eFixtures();
    await loginAsAdmin(page, superadmin.email, superadmin.password);
  });

  test('axe: dashboard autenticado (/admin)', async ({ page }, testInfo) => {
    await expectNoSeriousA11yViolations(page, testInfo, 'admin-dashboard');
  });

  test('axe: listado de productos (/admin/products)', async ({ page }, testInfo) => {
    await page.goto('/admin/products');
    await expectNoSeriousA11yViolations(page, testInfo, 'admin-products-list');
  });

  test('axe: edición de producto', async ({ page }, testInfo) => {
    await page.goto(`/admin/products/${scratchProductId}/edit`);
    await expectNoSeriousA11yViolations(page, testInfo, 'admin-product-edit');
  });

  test('axe: bandeja de solicitudes (/admin/requests)', async ({ page }, testInfo) => {
    await page.goto('/admin/requests');
    await expectNoSeriousA11yViolations(page, testInfo, 'admin-requests');
  });

  test('axe: gestión de comunas (/admin/home-visits)', async ({ page }, testInfo) => {
    await page.goto('/admin/home-visits');
    await expectNoSeriousA11yViolations(page, testInfo, 'admin-home-visits');
  });

  test('axe: configuración del negocio (/admin/settings)', async ({ page }, testInfo) => {
    await page.goto('/admin/settings');
    await expectNoSeriousA11yViolations(page, testInfo, 'admin-settings');
  });

  test('axe: usuarios administradores (/admin/users)', async ({ page }, testInfo) => {
    await page.goto('/admin/users');
    await expectNoSeriousA11yViolations(page, testInfo, 'admin-users');
  });

  test('axe: listado de categorías (/admin/categories)', async ({ page }, testInfo) => {
    await page.goto('/admin/categories');
    await expectNoSeriousA11yViolations(page, testInfo, 'admin-categories-list');
  });

  test('axe: edición de categoría (incluye el widget de imagen, Fase 6)', async ({ page }, testInfo) => {
    const category = await prisma.category.findFirstOrThrow();
    await page.goto(`/admin/categories/${category.id}/edit`);
    await expectNoSeriousA11yViolations(page, testInfo, 'admin-category-edit');
  });
});
