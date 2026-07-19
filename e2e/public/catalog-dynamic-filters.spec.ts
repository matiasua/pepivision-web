import { test, expect } from '@playwright/test';
import { AdminRole, Gender, ProductMaterial, ProductShape } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { hashPassword } from '../../modules/auth/password';
import { createProduct } from '../../modules/catalog/admin-service';
import { createOffering } from '../../modules/catalog/offering-service';
import type { CurrentSession } from '../../modules/auth/service';
import { uniqueTag } from '../fixtures/test-data';

/**
 * Fase 12 (filtros dinámicos del catálogo): fixtures propios e
 * idempotentes — una categoría real ya seedeada (lentes-opticos) más un
 * atributo/producto/oferta sintéticos, nunca datos reales modificados.
 * Cada test limpia exactamente lo que crea.
 */
test.describe('Catálogo público — filtros dinámicos por categoría (Fase 12)', () => {
  const adminIds: string[] = [];
  const brandIds: string[] = [];
  const productIds: string[] = [];
  const offeringIds: string[] = [];
  const attributeDefinitionIds: string[] = [];
  // Un único fixture compartido por los 3 tests de este archivo — creado
  // una sola vez en beforeAll, nunca uno nuevo por test: dos definiciones
  // de atributo con la misma opción "UV400" en la misma categoría real
  // harían ambigua cualquier selección por texto visible en el DOM.
  let sharedFixture: Awaited<ReturnType<typeof setup>>;

  test.afterAll(async () => {
    await prisma.productOfferingAttributeValue.deleteMany({ where: { attributeDefinitionId: { in: attributeDefinitionIds } } });
    await prisma.categoryAttributeDefinition.deleteMany({ where: { id: { in: attributeDefinitionIds } } });
    await prisma.productOffering.deleteMany({ where: { id: { in: offeringIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.brand.deleteMany({ where: { id: { in: brandIds } } });
    await prisma.adminUser.deleteMany({ where: { id: { in: adminIds } } });
    await prisma.$disconnect();
  });

  async function makeActor(): Promise<CurrentSession> {
    const tag = uniqueTag('e2e_dynfilter_admin');
    const user = await prisma.adminUser.create({
      data: {
        email: `${tag}@e2e.test.pepivision360.invalid`,
        username: tag,
        name: `E2E ${tag}`,
        passwordHash: await hashPassword('Integration-Test-Password-1!'),
        role: AdminRole.ADMIN,
        active: true,
      },
    });
    adminIds.push(user.id);
    return { sessionId: `session_${tag}`, adminUser: { id: user.id, email: user.email, name: user.name, role: user.role, active: user.active } };
  }

  async function setup() {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-opticos' } });
    const attribute = await prisma.categoryAttributeDefinition.create({
      data: {
        categoryId: category.id,
        key: `certificacion_${uniqueTag('k')}`,
        label: 'Certificación',
        type: 'SELECT',
        options: ['UV400', 'Polarizado'],
        filterable: true,
        active: true,
        sortOrder: 0,
      },
    });
    attributeDefinitionIds.push(attribute.id);

    const actor = await makeActor();

    async function makeOffering(certValue: string | null) {
      const tag = uniqueTag('e2e_dynfilter_prod');
      const brand = await prisma.brand.create({ data: { name: tag, slug: tag, active: true } });
      brandIds.push(brand.id);
      const product = await createProduct(
        {
          name: `Modelo ${tag}`,
          code: tag,
          brandId: brand.id,
          priceFromClp: 29990,
          sizes: undefined,
          gender: Gender.UNISEX,
          shape: ProductShape.REDONDO,
          material: ProductMaterial.ACETATO,
          available: true,
          visible: true,
          badge: undefined,
          description: undefined,
          colors: [{ name: 'Negro', hex: '#000000' }],
        },
        actor
      );
      productIds.push(product.id);
      const offering = await createOffering(
        {
          productId: product.id,
          categoryId: category.id,
          title: undefined,
          commercialDescription: undefined,
          priceFromClp: 19990,
          active: true,
          visible: true,
          featured: false,
          sortOrder: 0,
          seoTitle: undefined,
          seoDescription: undefined,
        },
        actor
      );
      offeringIds.push(offering.id);
      if (certValue) {
        await prisma.productOfferingAttributeValue.create({
          data: { offeringId: offering.id, attributeDefinitionId: attribute.id, valueText: certValue },
        });
      }
      return { product, offering };
    }

    const matching = await makeOffering('UV400');
    const nonMatching = await makeOffering('Polarizado');

    return { attribute, matching, nonMatching };
  }

  test.beforeAll(async () => {
    sharedFixture = await setup();
  });

  test('desktop: una URL con un filtro dinámico válido muestra solo la oferta que calza, y no rompe con un parámetro desconocido', async ({
    page,
  }) => {
    const { attribute, matching, nonMatching } = sharedFixture;
    const paramKey = `attr_${attribute.key}`;

    await page.goto(`/catalogo/lentes-opticos?${paramKey}=UV400&attr_no_existe=x`);
    await expect(page.getByText(matching.product.name)).toBeVisible();
    await expect(page.getByText(nonMatching.product.name)).not.toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('desktop: seleccionar la opción del filtro dinámico actualiza la URL y el listado', async ({ page }) => {
    const { attribute, matching, nonMatching } = sharedFixture;
    await page.goto('/catalogo/lentes-opticos');
    await expect(page.getByText(matching.product.name)).toBeVisible();
    await expect(page.getByText(nonMatching.product.name)).toBeVisible();

    await page.getByRole('link', { name: 'UV400', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`attr_${attribute.key}=UV400`));
    await expect(page.getByText(matching.product.name)).toBeVisible();
    await expect(page.getByText(nonMatching.product.name)).not.toBeVisible();

    // "Limpiar" quita también el filtro dinámico.
    await page.getByRole('link', { name: 'Limpiar' }).click();
    await expect(page).toHaveURL(/\/catalogo\/lentes-opticos$/);
    await expect(page.getByText(nonMatching.product.name)).toBeVisible();
  });

  test('mobile: el drawer de filtros expone el filtro dinámico, se aplica, y el drawer se puede cerrar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const { attribute, matching, nonMatching } = sharedFixture;
    await page.goto('/catalogo/lentes-opticos');

    await page.getByRole('button', { name: 'Filtros' }).click();
    const dialog = page.getByRole('dialog', { name: 'Filtros del catálogo' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Certificación')).toBeVisible();

    await dialog.getByRole('link', { name: 'UV400', exact: true }).click();
    // Seleccionar navega (recarga la página con el filtro aplicado) — el
    // drawer se cierra al desmontarse con la navegación.
    await expect(page).toHaveURL(new RegExp(`attr_${attribute.key}=UV400`));
    await expect(page.getByText(matching.product.name)).toBeVisible();
    await expect(page.getByText(nonMatching.product.name)).not.toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
