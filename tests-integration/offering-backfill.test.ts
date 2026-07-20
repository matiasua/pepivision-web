// Fase 15 (redesign-extensible-catalog-v2 — migración, backfill y corte
// definitivo, tarea 15.8). Real Postgres via Prisma, no mocks. Reutiliza
// la categoría canónica lentes-opticos ya sembrada, igual que otros
// archivos de esta carpeta. Crea únicamente productos/marcas/admins
// sintéticos propios, con códigos únicos (`uniqueTag`) — nunca toca
// DEBUGCODE1 ni ninguna categoría/oferta comercial real.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AdminRole, Gender, ProductMaterial, ProductShape } from '@prisma/client';
import { createProduct } from '@/modules/catalog/admin-service';
import { createOffering } from '@/modules/catalog/offering-service';
import { planProductOfferingBackfill, executeProductOfferingBackfill } from '@/modules/catalog/offering-backfill';
import { seedCategories } from '../prisma/seed';
import { createTestAdmin, deleteTestAdmins, prisma, uniqueTag } from './helpers';

describe('modules/catalog/offering-backfill (integration)', () => {
  const adminIds: string[] = [];
  const brandIds: string[] = [];
  const productIds: string[] = [];
  const offeringIds: string[] = [];
  let opticalCategoryId: string;

  beforeAll(async () => {
    await seedCategories();
    opticalCategoryId = (await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-opticos' } })).id;
  });

  afterAll(async () => {
    await prisma.productOffering.deleteMany({ where: { id: { in: offeringIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.brand.deleteMany({ where: { id: { in: brandIds } } });
    await deleteTestAdmins(adminIds);
  });

  async function makeActor() {
    const { user, session } = await createTestAdmin(AdminRole.ADMIN);
    adminIds.push(user.id);
    return session;
  }

  async function makeVisibleProductWithoutOffering(priceFromClp = 29990) {
    const actor = await makeActor();
    const tag = uniqueTag('backfill');
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
    return { product, actor };
  }

  it('1/6 — plans exactly one candidate for a visible Product without any offering, targeting lentes-opticos', async () => {
    const { product } = await makeVisibleProductWithoutOffering(29990);

    const plan = await planProductOfferingBackfill();

    const candidate = plan.candidates.find((c) => c.productId === product.id);
    expect(candidate).toBeTruthy();
    expect(candidate!.plannedSlug).toBe(product.slug);
    expect(candidate!.priceFromClp).toBe(29990);
    expect(plan.categorySlug).toBe('lentes-opticos');
  });

  it('2/11 — a Product that already has an offering (in any category) is never a candidate, and that offering is preserved untouched', async () => {
    const { product, actor } = await makeVisibleProductWithoutOffering(19990);
    const sunCategory = await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-de-sol' } });
    const existingOffering = await createOffering(
      {
        productId: product.id,
        categoryId: sunCategory.id, // deliberadamente NO lentes-opticos — sigue sin ser candidato
        title: undefined,
        commercialDescription: undefined,
        priceFromClp: 55000, // deliberadamente distinto al priceFromClp del Product
        active: true,
        visible: true,
        featured: false,
        sortOrder: 0,
        seoTitle: undefined,
        seoDescription: undefined,
      },
      actor
    );
    offeringIds.push(existingOffering.id);

    const plan = await planProductOfferingBackfill();
    expect(plan.candidates.some((c) => c.productId === product.id)).toBe(false);

    await executeProductOfferingBackfill();

    const offeringAfter = await prisma.productOffering.findUniqueOrThrow({ where: { id: existingOffering.id } });
    expect(offeringAfter.categoryId).toBe(sunCategory.id);
    expect(offeringAfter.priceFromClp).toBe(55000); // divergencia legítima preservada exactamente
    const offeringCount = await prisma.productOffering.count({ where: { productId: product.id } });
    expect(offeringCount).toBe(1); // nunca se crea una segunda oferta
  });

  it('3 — a slug conflict against an existing lentes-opticos offering is reported and the candidate is excluded, never overwritten', async () => {
    // `Product.slug` es único globalmente, así que dos candidatos de esta
    // misma corrida nunca pueden colisionar entre sí (ver
    // modules/catalog/offering-backfill.ts). El único caso real posible es
    // una ProductOffering YA existente en lentes-opticos cuyo `slug` (un
    // string libre, no una FK) coincide con el de un producto candidato
    // distinto — un estado de datos anómalo, simulado aquí directamente
    // vía Prisma (nunca alcanzable a través del admin real, que siempre
    // deriva `offering.slug = product.slug` de su propio producto).
    const { product: candidateProduct } = await makeVisibleProductWithoutOffering(15000);
    const { product: decoyProduct } = await makeVisibleProductWithoutOffering(20000);

    const collisionOffering = await prisma.productOffering.create({
      data: {
        productId: decoyProduct.id,
        categoryId: opticalCategoryId,
        slug: candidateProduct.slug, // colisión deliberada con el slug del candidato
        priceFromClp: 20000,
        active: true,
        visible: true,
      },
    });
    offeringIds.push(collisionOffering.id);

    const plan = await planProductOfferingBackfill();
    const conflict = plan.slugConflicts.find((c) => c.productId === candidateProduct.id);
    expect(conflict).toBeTruthy();
    expect(conflict!.slug).toBe(candidateProduct.slug);
    expect(conflict!.conflictingOfferingId).toBe(collisionOffering.id);
    expect(plan.candidates.some((c) => c.productId === candidateProduct.id)).toBe(false);

    await expect(executeProductOfferingBackfill()).rejects.toThrow();
    const stillNoOffering = await prisma.productOffering.count({ where: { productId: candidateProduct.id } });
    expect(stillNoOffering).toBe(0);

    // Resuelve el conflicto de inmediato (no se difiere al afterAll
    // compartido) — de lo contrario, candidateProduct seguiría siendo un
    // candidato sin resolver y abortaría el lote completo de cualquier
    // otro test posterior que llame a executeProductOfferingBackfill().
    await prisma.product.update({ where: { id: candidateProduct.id }, data: { visible: false } });
  });

  it('5/6/7 — dry-run never writes; write mode creates exactly the planned offerings copying priceFromClp and slug', async () => {
    const { product } = await makeVisibleProductWithoutOffering(45990);

    const beforeCount = await prisma.productOffering.count();
    const plan = await planProductOfferingBackfill();
    expect(plan.candidates.some((c) => c.productId === product.id)).toBe(true);

    const afterPlanCount = await prisma.productOffering.count();
    expect(afterPlanCount).toBe(beforeCount); // el dry-run nunca escribe

    const result = await executeProductOfferingBackfill();
    const createdOffering = await prisma.productOffering.findFirstOrThrow({ where: { productId: product.id } });
    offeringIds.push(createdOffering.id);

    expect(result.createdOfferingIds).toContain(createdOffering.id);
    expect(createdOffering.categoryId).toBe(opticalCategoryId);
    expect(createdOffering.slug).toBe(product.slug);
    expect(createdOffering.priceFromClp).toBe(45990);
    expect(createdOffering.active).toBe(true);
    expect(createdOffering.visible).toBe(true);
  });

  it('8 — a second execution creates nothing more once every visible Product has an offering (idempotent)', async () => {
    const { product } = await makeVisibleProductWithoutOffering(22990);

    const first = await executeProductOfferingBackfill();
    const created = await prisma.productOffering.findFirstOrThrow({ where: { productId: product.id } });
    offeringIds.push(created.id);
    expect(first.createdOfferingIds).toContain(created.id);

    const second = await executeProductOfferingBackfill();
    expect(second.createdOfferingIds).not.toContain(created.id);

    const stillOne = await prisma.productOffering.count({ where: { productId: product.id } });
    expect(stillOne).toBe(1);
  });

  it('10 — final counts: after backfilling every candidate, 0 visible Products remain without an offering', async () => {
    const { product: a } = await makeVisibleProductWithoutOffering(10000);
    const { product: b } = await makeVisibleProductWithoutOffering(20000);

    await executeProductOfferingBackfill();

    const stillWithout = await prisma.product.count({
      where: { id: { in: [a.id, b.id] }, offerings: { none: {} } },
    });
    expect(stillWithout).toBe(0);

    const offeringA = await prisma.productOffering.findFirstOrThrow({ where: { productId: a.id } });
    const offeringB = await prisma.productOffering.findFirstOrThrow({ where: { productId: b.id } });
    offeringIds.push(offeringA.id, offeringB.id);
  });

  it('12 — a legacy /catalogo/[slug] URL for a just-backfilled Product now resolves to its new lentes-opticos offering', async () => {
    const { product } = await makeVisibleProductWithoutOffering(31000);

    await executeProductOfferingBackfill();
    const created = await prisma.productOffering.findFirstOrThrow({ where: { productId: product.id } });
    offeringIds.push(created.id);

    const { getLegacyRedirectTarget } = await import('@/modules/catalog/service');
    const target = await getLegacyRedirectTarget(product.slug);
    expect(target).toEqual({ categorySlug: 'lentes-opticos', offeringSlug: product.slug });
  });

  it('regresión completa del backfill (auditoría del skip de e2e/public/catalog.spec.ts): ausente antes, detectado en dry-run, creado en write, visible en catálogo y sitemap, legacy resuelto, segunda escritura sin cambios', async () => {
    const { getCatalogForCategory, getPublicOfferingsForSitemap, getLegacyRedirectTarget } = await import(
      '@/modules/catalog/service'
    );

    const { product } = await makeVisibleProductWithoutOffering(27990);

    // 1) Antes del backfill: ausente del listado público de la categoría.
    const beforeCatalog = await getCatalogForCategory('lentes-opticos', { availableOnly: false });
    expect(beforeCatalog!.offerings.some((o) => o.productId === product.id)).toBe(false);

    // 2) Dry-run lo detecta como candidato, sin escribir.
    const plan = await planProductOfferingBackfill();
    expect(plan.candidates.some((c) => c.productId === product.id)).toBe(true);
    const stillNone = await prisma.productOffering.count({ where: { productId: product.id } });
    expect(stillNone).toBe(0);

    // 3) Write mode crea exactamente una oferta.
    const writeResult = await executeProductOfferingBackfill();
    const created = await prisma.productOffering.findFirstOrThrow({ where: { productId: product.id } });
    offeringIds.push(created.id);
    expect(writeResult.createdOfferingIds).toContain(created.id);
    expect(await prisma.productOffering.count({ where: { productId: product.id } })).toBe(1);

    // 4) Ahora aparece en el listado público de la categoría.
    const afterCatalog = await getCatalogForCategory('lentes-opticos', { availableOnly: false });
    expect(afterCatalog!.offerings.some((o) => o.productId === product.id)).toBe(true);

    // 5) Aparece en el sitemap.
    const sitemapEntries = await getPublicOfferingsForSitemap();
    expect(sitemapEntries).toContainEqual({
      categorySlug: 'lentes-opticos',
      offeringSlug: product.slug,
      updatedAt: created.updatedAt,
    });

    // 6) La URL legada de un segmento ahora resuelve a la nueva oferta
    // (el redirect HTTP 308 real, sin cadenas, ya se demuestra contra el
    // stack completo en e2e/public/catalog-seo.spec.ts).
    const legacyTarget = await getLegacyRedirectTarget(product.slug);
    expect(legacyTarget).toEqual({ categorySlug: 'lentes-opticos', offeringSlug: product.slug });

    // 7) Segunda ejecución: cleanup selectivo — cero cambios, la oferta ya creada se preserva intacta.
    const secondWrite = await executeProductOfferingBackfill();
    expect(secondWrite.createdOfferingIds).not.toContain(created.id);
    const unchanged = await prisma.productOffering.findUniqueOrThrow({ where: { id: created.id } });
    expect(unchanged.priceFromClp).toBe(27990);
    expect(unchanged.categoryId).toBe(opticalCategoryId);
  });
});
