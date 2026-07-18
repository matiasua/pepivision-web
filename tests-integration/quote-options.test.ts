// Fase 9 (redesign-extensible-catalog-v2) — motor de compatibilidades,
// contra PostgreSQL real. Crea sus propias categorías/productos/ofertas
// sintéticas (nunca reutiliza ni modifica las dos categorías canónicas
// `lentes-opticos`/`lentes-de-sol`, ver la nota de `prisma/seed.ts` sobre
// `update: {}`) — mismo criterio que `product-offerings.test.ts` (3.8) ya
// aplica para su categoría inactiva efímera.
import { afterAll, describe, expect, it } from 'vitest';
import { AdminRole, Gender, ProductMaterial, ProductShape, Prisma } from '@prisma/client';
import { createProduct } from '@/modules/catalog/admin-service';
import { createOffering } from '@/modules/catalog/offering-service';
import { getCategoryLensOptions, resolveAndValidateLensSelection } from '@/modules/catalog/quote-options-service';
import { LENTES_OPTICOS_QUOTE_OPTIONS, LENTES_DE_SOL_QUOTE_OPTIONS } from '@/modules/catalog/quote-options';
import { createTestAdmin, deleteTestAdmins, prisma, uniqueTag } from './helpers';

describe('modules/catalog/quote-options-service — motor de compatibilidades (integration)', () => {
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

  async function makeCategory(quoteOptions: unknown, overrides: { active?: boolean } = {}) {
    const tag = uniqueTag('cat');
    const category = await prisma.category.create({
      data: {
        name: `Categoría ${tag}`,
        slug: tag,
        active: overrides.active ?? true,
        visible: true,
        capabilities: {
          requiresColor: true,
          allowsLensType: true,
          allowsTreatments: true,
          allowsPrescription: true,
          allowsPrescriptionAttachment: true,
          allowsLensTint: false,
          allowsFrameSelection: true,
          quoteOptions,
        } as Prisma.InputJsonValue,
      },
    });
    categoryIds.push(category.id);
    return category;
  }

  async function makeProduct(visible = true) {
    const actor = await makeActor();
    const tag = uniqueTag('prod');
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
        visible,
        badge: undefined,
        description: undefined,
        colors: [{ name: 'Negro', hex: '#000000' }],
      },
      actor
    );
    productIds.push(product.id);
    return product;
  }

  async function makeOffering(productId: string, categoryId: string, overrides: { active?: boolean; visible?: boolean } = {}) {
    const actor = await makeActor();
    const offering = await createOffering(
      {
        productId,
        categoryId,
        title: undefined,
        commercialDescription: undefined,
        priceFromClp: 19990,
        active: overrides.active ?? true,
        visible: overrides.visible ?? true,
        featured: false,
        sortOrder: 0,
        seoTitle: undefined,
        seoDescription: undefined,
      },
      actor
    );
    offeringIds.push(offering.id);
    return offering;
  }

  it('1/3 — ProductOffering de Lentes ópticos: selección óptica válida', async () => {
    const category = await makeCategory(LENTES_OPTICOS_QUOTE_OPTIONS);
    const product = await makeProduct();
    const offering = await makeOffering(product.id, category.id);

    const result = await resolveAndValidateLensSelection({
      categoryId: category.id,
      offeringId: offering.id,
      lensModality: 'monofocal',
      treatments: ['antirreflejo'],
      additionalOptions: ['alto-indice'],
      needsPrescription: true,
    });
    expect(result.ok).toBe(true);
  });

  it('2/4 — ProductOffering de Lentes de sol: selección solar válida', async () => {
    const category = await makeCategory(LENTES_DE_SOL_QUOTE_OPTIONS);
    const product = await makeProduct();
    const offering = await makeOffering(product.id, category.id);

    const result = await resolveAndValidateLensSelection({
      categoryId: category.id,
      offeringId: offering.id,
      lensModality: 'solar-progresivo',
      treatments: ['uv400'],
      additionalOptions: ['polarizado'],
      needsPrescription: true,
    });
    expect(result.ok).toBe(true);
  });

  it('5 — combinación incompatible (tratamiento óptico dentro de una categoría solar) es rechazada', async () => {
    const category = await makeCategory(LENTES_DE_SOL_QUOTE_OPTIONS);
    const product = await makeProduct();
    const offering = await makeOffering(product.id, category.id);

    const result = await resolveAndValidateLensSelection({
      categoryId: category.id,
      offeringId: offering.id,
      lensModality: 'solar-monofocal',
      treatments: ['filtro-azul-violeta'],
      additionalOptions: [],
      needsPrescription: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.code === 'unknown_treatment')).toBe(true);
  });

  it('6 — una oferta asociada a otra categoría es rechazada', async () => {
    const categoryA = await makeCategory(LENTES_OPTICOS_QUOTE_OPTIONS);
    const categoryB = await makeCategory(LENTES_DE_SOL_QUOTE_OPTIONS);
    const product = await makeProduct();
    const offering = await makeOffering(product.id, categoryA.id);

    const result = await resolveAndValidateLensSelection({
      categoryId: categoryB.id, // reclama la categoría equivocada para esta oferta
      offeringId: offering.id,
      lensModality: 'sin-graduacion',
      treatments: [],
      additionalOptions: [],
      needsPrescription: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.code === 'offering_mismatch')).toBe(true);
  });

  it('7 — una Category inactiva nunca resuelve opciones (fail-closed)', async () => {
    const category = await makeCategory(LENTES_OPTICOS_QUOTE_OPTIONS, { active: false });
    const options = await getCategoryLensOptions(category.slug);
    expect(options).toEqual({ version: 1, lensTypes: [], treatments: [], additionalOptions: [] });

    const product = await makeProduct();
    const offering = await makeOffering(product.id, category.id);
    const result = await resolveAndValidateLensSelection({
      categoryId: category.id,
      offeringId: offering.id,
      lensModality: 'monofocal',
      treatments: [],
      additionalOptions: [],
      needsPrescription: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.code === 'inactive_category')).toBe(true);
  });

  it('8 — una ProductOffering inactiva es rechazada aunque la categoría/producto estén bien', async () => {
    const category = await makeCategory(LENTES_OPTICOS_QUOTE_OPTIONS);
    const product = await makeProduct();
    const offering = await makeOffering(product.id, category.id, { active: false });

    const result = await resolveAndValidateLensSelection({
      categoryId: category.id,
      offeringId: offering.id,
      lensModality: 'monofocal',
      treatments: [],
      additionalOptions: [],
      needsPrescription: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.code === 'inactive_offering')).toBe(true);
  });

  it('9 — un Product no visible es rechazado', async () => {
    const category = await makeCategory(LENTES_OPTICOS_QUOTE_OPTIONS);
    const product = await makeProduct(false);
    const offering = await makeOffering(product.id, category.id);

    const result = await resolveAndValidateLensSelection({
      categoryId: category.id,
      offeringId: offering.id,
      lensModality: 'monofocal',
      treatments: [],
      additionalOptions: [],
      needsPrescription: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.code === 'inactive_product')).toBe(true);
  });

  it('10 — quoteOptions inválido persistido en Category.capabilities resuelve fail-closed, nunca lanza', async () => {
    const category = await makeCategory({ version: 1, lensTypes: ['inventado'], treatments: [], additionalOptions: [] });
    const options = await getCategoryLensOptions(category.slug);
    expect(options).toEqual({ version: 1, lensTypes: [], treatments: [], additionalOptions: [] });
  });

  it('una categoría inexistente es rechazada de forma estructurada', async () => {
    const result = await resolveAndValidateLensSelection({
      categoryId: 'no-existe-jamas',
      lensModality: 'monofocal',
      treatments: [],
      additionalOptions: [],
      needsPrescription: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.code === 'unknown_category')).toBe(true);
  });
});
