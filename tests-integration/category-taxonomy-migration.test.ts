// Cubre Fase 5 (5.1, 5.2, 5.3, 5.6, 5.7) de redesign-extensible-catalog-v2:
// modules/catalog/taxonomy-migration.ts#migrateToDefinitiveTaxonomy()
// contra Postgres real, no mocks. Esta migración opera sobre slugs fijos y
// globales (armazones, lentes-opticos, lentes-de-sol-opticos, lentes-de-sol)
// — no son fixtures por-test únicos como el resto de esta carpeta, son las
// filas de categoría compartidas del entorno de desarrollo (mismo criterio
// que tests-integration/category-seed.test.ts ya aplica a lentes-opticos/
// lentes-de-sol). Cada test prepara sus propias precondiciones (crea la
// categoría legada si no existe) para ser tolerante al orden de ejecución
// respecto a otros archivos de esta carpeta, y limpia únicamente los
// productos/ofertas sintéticos que crea — nunca las filas Category
// compartidas ni datos de otros tests.
import { afterAll, describe, expect, it } from 'vitest';
import { AdminRole, Gender, ProductMaterial, ProductShape } from '@prisma/client';
import { createProduct } from '@/modules/catalog/admin-service';
import { migrateToDefinitiveTaxonomy } from '@/modules/catalog/taxonomy-migration';
import { createTestAdmin, deleteTestAdmins, prisma, uniqueTag } from './helpers';

const ARMAZONES_CAPABILITIES = {
  requiresColor: true,
  allowsLensType: false,
  allowsTreatments: false,
  allowsPrescription: false,
  allowsPrescriptionAttachment: false,
  allowsLensTint: false,
  allowsFrameSelection: true,
};

describe('modules/catalog/taxonomy-migration — migrateToDefinitiveTaxonomy (integration)', () => {
  const adminIds: string[] = [];
  const productIds: string[] = [];
  const brandIds: string[] = [];

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.brand.deleteMany({ where: { id: { in: brandIds } } });
    await deleteTestAdmins(adminIds);
  });

  async function makeActor() {
    const { user, session } = await createTestAdmin(AdminRole.ADMIN);
    adminIds.push(user.id);
    return session;
  }

  async function makeProduct() {
    const actor = await makeActor();
    const tag = uniqueTag('taxprod');
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
    return product;
  }

  async function ensureCategory(slug: string, name: string, capabilities: Record<string, boolean>) {
    return prisma.category.upsert({
      where: { slug },
      update: {},
      create: { slug, name, capabilities },
    });
  }

  async function ensureOpticalCategory() {
    return ensureCategory('lentes-opticos', 'Lentes ópticos', {
      requiresColor: true,
      allowsLensType: true,
      allowsTreatments: true,
      allowsPrescription: true,
      allowsPrescriptionAttachment: true,
      allowsLensTint: false,
      allowsFrameSelection: true,
    });
  }

  it('remaps an armazones-only offering into lentes-opticos and deletes the now-empty armazones category, idempotently', async () => {
    await ensureOpticalCategory();
    const armazones = await ensureCategory('armazones', 'Armazones', ARMAZONES_CAPABILITIES);
    const product = await makeProduct();
    const offering = await prisma.productOffering.create({
      data: { productId: product.id, categoryId: armazones.id, slug: product.slug, priceFromClp: 19990, active: true, visible: true },
    });

    const firstRun = await migrateToDefinitiveTaxonomy();
    expect(firstRun.remappedOfferingIds).toContain(offering.id);
    expect(firstRun.armazonesCategoryDeleted).toBe(true);
    expect(firstRun.conflicts).toHaveLength(0);

    const optical = await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-opticos' } });
    const movedOffering = await prisma.productOffering.findUniqueOrThrow({ where: { id: offering.id } });
    expect(movedOffering.categoryId).toBe(optical.id);
    // Precio, slug e historial preservados — nada se pierde en el remapeo.
    expect(movedOffering.priceFromClp).toBe(19990);
    expect(movedOffering.slug).toBe(product.slug);

    const armazonesGone = await prisma.category.findUnique({ where: { slug: 'armazones' } });
    expect(armazonesGone).toBeNull();

    // Segunda corrida: no-op — nada que remapear, nada que borrar de nuevo.
    const secondRun = await migrateToDefinitiveTaxonomy();
    expect(secondRun.remappedOfferingIds).toHaveLength(0);
    expect(secondRun.armazonesCategoryDeleted).toBe(false);
    const stillMoved = await prisma.productOffering.findUniqueOrThrow({ where: { id: offering.id } });
    expect(stillMoved.categoryId).toBe(optical.id);
  });

  it('flags a product with offerings in both armazones and lentes-opticos as a conflict, without merging or deleting either row', async () => {
    const optical = await ensureOpticalCategory();
    const armazones = await ensureCategory('armazones', 'Armazones', ARMAZONES_CAPABILITIES);
    const product = await makeProduct();

    const armazonesOffering = await prisma.productOffering.create({
      data: { productId: product.id, categoryId: armazones.id, slug: `${product.slug}-frame`, priceFromClp: 9990, active: true, visible: true },
    });
    const opticalOffering = await prisma.productOffering.create({
      data: { productId: product.id, categoryId: optical.id, slug: product.slug, priceFromClp: 39990, active: true, visible: true },
    });

    const report = await migrateToDefinitiveTaxonomy();
    expect(report.conflicts).toContainEqual({
      productId: product.id,
      armazonesOfferingId: armazonesOffering.id,
      lentesOpticosOfferingId: opticalOffering.id,
    });
    expect(report.remappedOfferingIds).not.toContain(armazonesOffering.id);
    expect(report.armazonesCategoryDeleted).toBe(false);

    // Ninguna de las dos ofertas en conflicto se pierde, se fusiona ni se sobrescribe.
    const stillArmazones = await prisma.productOffering.findUniqueOrThrow({ where: { id: armazonesOffering.id } });
    expect(stillArmazones.categoryId).toBe(armazones.id);
    expect(stillArmazones.priceFromClp).toBe(9990);
    const stillOptical = await prisma.productOffering.findUniqueOrThrow({ where: { id: opticalOffering.id } });
    expect(stillOptical.priceFromClp).toBe(39990);

    // Limpieza: al eliminar la oferta en conflicto, una corrida posterior sí
    // puede completar el remapeo y borrar la categoría vacía — deja el
    // entorno en el estado migrado esperado por el resto de la suite.
    await prisma.productOffering.delete({ where: { id: armazonesOffering.id } });
    await migrateToDefinitiveTaxonomy();
    const armazonesGone = await prisma.category.findUnique({ where: { slug: 'armazones' } });
    expect(armazonesGone).toBeNull();
  });

  it('renames lentes-de-sol-opticos to lentes-de-sol in place, preserving id and existing offerings', async () => {
    await ensureOpticalCategory();
    const alreadyDefinitive = await prisma.category.findUnique({ where: { slug: 'lentes-de-sol' } });
    if (alreadyDefinitive) {
      // Otro archivo de esta suite (o una corrida anterior) ya completó el
      // renombre — comportamiento correcto e idempotente, nada más que
      // verificar aquí sin recrear una fila legada artificial.
      const legacyStillExists = await prisma.category.findUnique({ where: { slug: 'lentes-de-sol-opticos' } });
      expect(legacyStillExists).toBeNull();
      return;
    }

    const legacySun = await ensureCategory('lentes-de-sol-opticos', 'Lentes de sol ópticos', {
      requiresColor: true,
      allowsLensType: true,
      allowsTreatments: true,
      allowsPrescription: true,
      allowsPrescriptionAttachment: true,
      allowsLensTint: true,
      allowsFrameSelection: true,
    });
    const product = await makeProduct();
    const offering = await prisma.productOffering.create({
      data: { productId: product.id, categoryId: legacySun.id, slug: product.slug, priceFromClp: 45990, active: true, visible: true },
    });

    const report = await migrateToDefinitiveTaxonomy();
    expect(report.renamedLentesDeSolOpticos).toBe(true);

    const renamed = await prisma.category.findUniqueOrThrow({ where: { id: legacySun.id } });
    expect(renamed.slug).toBe('lentes-de-sol');
    expect(renamed.name).toBe('Lentes de sol');

    const offeringAfter = await prisma.productOffering.findUniqueOrThrow({ where: { id: offering.id } });
    expect(offeringAfter.categoryId).toBe(legacySun.id); // sin cambios — mismo id, nunca tocado
    expect(offeringAfter.priceFromClp).toBe(45990);

    const secondRun = await migrateToDefinitiveTaxonomy();
    expect(secondRun.renamedLentesDeSolOpticos).toBe(false); // idempotente: ya no queda fila legada
  });
});
