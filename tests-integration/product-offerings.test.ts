// Cubre Fase 3, tareas 3.3-3.9 de redesign-extensible-catalog-v2. Real
// Postgres via Prisma, no mocks. Reutiliza las dos categorías reales
// sembradas en la Fase 2 (armazones, lentes-opticos) como fixtures
// compartidos — igual que otros archivos de esta carpeta reutilizan
// Brand/EnabledComuna — y crea una tercera categoría efímera propia solo
// para el escenario de categoría inactiva (3.8), que sí se limpia.
import { afterAll, describe, expect, it } from 'vitest';
import { AdminRole, Gender, ProductMaterial, ProductShape } from '@prisma/client';
import { createProduct } from '@/modules/catalog/admin-service';
import {
  createOffering,
  listVisibleOfferingsForCategory,
  updateOffering,
  verifyOfferingOwnership,
} from '@/modules/catalog/offering-service';
import { createTestAdmin, deleteTestAdmins, prisma, uniqueTag } from './helpers';

describe('modules/catalog/offering-service — ProductOffering (integration)', () => {
  const adminIds: string[] = [];
  const brandIds: string[] = [];
  const productIds: string[] = [];
  const offeringIds: string[] = [];
  const categoryIds: string[] = [];

  afterAll(async () => {
    await prisma.productOffering.deleteMany({ where: { id: { in: offeringIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.brand.deleteMany({ where: { id: { in: brandIds } } });
    await prisma.category.deleteMany({ where: { id: { in: categoryIds } } });
    await deleteTestAdmins(adminIds);
  });

  async function makeActor() {
    const { user, session } = await createTestAdmin(AdminRole.ADMIN);
    adminIds.push(user.id);
    return session;
  }

  async function makeProduct(priceFromClp = 29990) {
    const actor = await makeActor();
    const tag = uniqueTag('prod');
    const brand = await prisma.brand.create({ data: { name: tag, slug: tag, active: true } });
    brandIds.push(brand.id);

    const product = await createProduct(
      {
        name: `Modelo ${tag}`,
        code: tag,
        brandId: brand.id,
        priceFromClp,
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
    return product;
  }

  async function categoryIdBySlug(slug: string) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug } });
    return category.id;
  }

  it('3.4 — the same Product in two categories reuses its colors/images, never duplicates them', async () => {
    const product = await makeProduct();
    const armazonesId = await categoryIdBySlug('armazones');
    const lentesOpticosId = await categoryIdBySlug('lentes-opticos');

    const offeringA = await createOffering({
      productId: product.id,
      categoryId: armazonesId,
      title: undefined,
      commercialDescription: undefined,
      priceFromClp: 19990,
      active: true,
      visible: true,
      featured: false,
      sortOrder: 0,
      seoTitle: undefined,
      seoDescription: undefined,
    });
    const offeringB = await createOffering({
      productId: product.id,
      categoryId: lentesOpticosId,
      title: undefined,
      commercialDescription: undefined,
      priceFromClp: 39990,
      active: true,
      visible: true,
      featured: false,
      sortOrder: 0,
      seoTitle: undefined,
      seoDescription: undefined,
    });
    offeringIds.push(offeringA.id, offeringB.id);

    expect(offeringA.productId).toBe(product.id);
    expect(offeringB.productId).toBe(product.id);

    const colors = await prisma.productColor.findMany({ where: { productId: product.id } });
    expect(colors).toHaveLength(1); // no color duplicado por la segunda oferta

    // 3.5 — mismo Product, precio distinto por categoría.
    expect(offeringA.priceFromClp).toBe(19990);
    expect(offeringB.priceFromClp).toBe(39990);
  });

  it('3.6 — creating a second offering for the same (productId, categoryId) is rejected', async () => {
    const product = await makeProduct();
    const armazonesId = await categoryIdBySlug('armazones');

    const first = await createOffering({
      productId: product.id,
      categoryId: armazonesId,
      title: undefined,
      commercialDescription: undefined,
      priceFromClp: 19990,
      active: true,
      visible: true,
      featured: false,
      sortOrder: 0,
      seoTitle: undefined,
      seoDescription: undefined,
    });
    offeringIds.push(first.id);

    await expect(
      createOffering({
        productId: product.id,
        categoryId: armazonesId,
        title: undefined,
        commercialDescription: undefined,
        priceFromClp: 9990,
        active: true,
        visible: true,
        featured: false,
        sortOrder: 0,
        seoTitle: undefined,
        seoDescription: undefined,
      })
    ).rejects.toThrow();

    const count = await prisma.productOffering.count({ where: { productId: product.id, categoryId: armazonesId } });
    expect(count).toBe(1);
  });

  it('3.7 — an offering that does not belong to the claimed category is rejected', async () => {
    const product = await makeProduct();
    const armazonesId = await categoryIdBySlug('armazones');
    const lentesOpticosId = await categoryIdBySlug('lentes-opticos');

    const offering = await createOffering({
      productId: product.id,
      categoryId: armazonesId,
      title: undefined,
      commercialDescription: undefined,
      priceFromClp: 19990,
      active: true,
      visible: true,
      featured: false,
      sortOrder: 0,
      seoTitle: undefined,
      seoDescription: undefined,
    });
    offeringIds.push(offering.id);

    await expect(verifyOfferingOwnership(offering.id, lentesOpticosId, product.id)).rejects.toThrow();
    await expect(verifyOfferingOwnership(offering.id, armazonesId, product.id)).resolves.toMatchObject({ id: offering.id });
  });

  it('3.8 — inactive category / invisible offering are excluded from public listings', async () => {
    const productVisible = await makeProduct();
    const productHiddenOffering = await makeProduct();
    const armazonesId = await categoryIdBySlug('armazones');

    const inactiveCategory = await prisma.category.create({
      data: {
        name: `Categoría inactiva ${uniqueTag()}`,
        slug: uniqueTag('cat-inactive'),
        active: false,
        visible: true,
        capabilities: { requiresColor: true, allowsFrameSelection: true },
      },
    });
    categoryIds.push(inactiveCategory.id);

    const visibleOffering = await createOffering({
      productId: productVisible.id,
      categoryId: armazonesId,
      title: undefined,
      commercialDescription: undefined,
      priceFromClp: 19990,
      active: true,
      visible: true,
      featured: false,
      sortOrder: 0,
      seoTitle: undefined,
      seoDescription: undefined,
    });
    const invisibleOffering = await createOffering({
      productId: productHiddenOffering.id,
      categoryId: armazonesId,
      title: undefined,
      commercialDescription: undefined,
      priceFromClp: 19990,
      active: true,
      visible: false, // oferta invisible
      featured: false,
      sortOrder: 0,
      seoTitle: undefined,
      seoDescription: undefined,
    });
    const offeringInInactiveCategory = await createOffering({
      productId: productVisible.id,
      categoryId: inactiveCategory.id,
      title: undefined,
      commercialDescription: undefined,
      priceFromClp: 19990,
      active: true,
      visible: true,
      featured: false,
      sortOrder: 0,
      seoTitle: undefined,
      seoDescription: undefined,
    });
    offeringIds.push(visibleOffering.id, invisibleOffering.id, offeringInInactiveCategory.id);

    const armazonesListing = await listVisibleOfferingsForCategory(armazonesId);
    const listedIds = armazonesListing.map((o) => o.id);
    expect(listedIds).toContain(visibleOffering.id);
    expect(listedIds).not.toContain(invisibleOffering.id);

    const inactiveCategoryListing = await listVisibleOfferingsForCategory(inactiveCategory.id);
    expect(inactiveCategoryListing.map((o) => o.id)).not.toContain(offeringInInactiveCategory.id);
  });

  it('3.3 — creating and updating an offering with a different price never touches Product.priceFromClp (no reverse sync)', async () => {
    const product = await makeProduct(29990); // precio V1 del Product base
    const armazonesId = await categoryIdBySlug('armazones');

    const offering = await createOffering({
      productId: product.id,
      categoryId: armazonesId,
      title: undefined,
      commercialDescription: undefined,
      priceFromClp: 15000, // deliberadamente distinto al priceFromClp del Product
      active: true,
      visible: true,
      featured: false,
      sortOrder: 0,
      seoTitle: undefined,
      seoDescription: undefined,
    });
    offeringIds.push(offering.id);

    expect(offering.priceFromClp).toBe(15000);
    const productAfterCreate = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(productAfterCreate.priceFromClp).toBe(29990); // sin cambios

    const updated = await updateOffering(offering.id, {
      productId: product.id,
      categoryId: armazonesId,
      title: undefined,
      commercialDescription: undefined,
      priceFromClp: 45000, // otra edición, otra vez distinta
      active: true,
      visible: true,
      featured: false,
      sortOrder: 0,
      seoTitle: undefined,
      seoDescription: undefined,
    });

    expect(updated.priceFromClp).toBe(45000);
    const productAfterUpdate = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(productAfterUpdate.priceFromClp).toBe(29990); // sigue exactamente igual
  });

  it('3.9 — editing Product.priceFromClp after an offering exists does not change the offering price', async () => {
    const product = await makeProduct(29990);
    const armazonesId = await categoryIdBySlug('armazones');

    const offering = await createOffering({
      productId: product.id,
      categoryId: armazonesId,
      title: undefined,
      commercialDescription: undefined,
      priceFromClp: 19990,
      active: true,
      visible: true,
      featured: false,
      sortOrder: 0,
      seoTitle: undefined,
      seoDescription: undefined,
    });
    offeringIds.push(offering.id);

    await prisma.product.update({ where: { id: product.id }, data: { priceFromClp: 99990 } });

    const offeringAfter = await prisma.productOffering.findUniqueOrThrow({ where: { id: offering.id } });
    expect(offeringAfter.priceFromClp).toBe(19990);
  });
});
