// Fase 12 (redesign-extensible-catalog-v2 — filtros dinámicos del
// catálogo): fixtures sintéticos propios (categoría real ya seedeada +
// producto/oferta/atributo sintéticos), nunca datos reales modificados.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AdminRole, Gender, ProductMaterial, ProductShape } from '@prisma/client';
import { createProduct } from '@/modules/catalog/admin-service';
import { createOffering } from '@/modules/catalog/offering-service';
import {
  getCatalogForCategory,
  getCategoryFilterableAttributes,
} from '@/modules/catalog/service';
import { parseDynamicFilters } from '@/modules/catalog/dynamic-filters';
import { seedCategories } from '../prisma/seed';
import { createTestAdmin, deleteTestAdmins, prisma, uniqueTag } from './helpers';

describe('modules/catalog — filtros dinámicos por categoría (Fase 12, integration)', () => {
  const adminIds: string[] = [];
  const brandIds: string[] = [];
  const productIds: string[] = [];
  const offeringIds: string[] = [];
  const attributeDefinitionIds: string[] = [];
  let opticalCategoryId: string;
  let certificacionDefId: string;
  let internalNoteDefId: string;

  beforeAll(async () => {
    await seedCategories();
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-opticos' } });
    opticalCategoryId = category.id;

    const certificacion = await prisma.categoryAttributeDefinition.create({
      data: {
        categoryId: opticalCategoryId,
        key: `certificacion_${uniqueTag('k')}`,
        label: 'Certificación',
        type: 'SELECT',
        options: ['uv400', 'polarizado'],
        filterable: true,
        active: true,
        sortOrder: 0,
      },
    });
    certificacionDefId = certificacion.id;
    attributeDefinitionIds.push(certificacion.id);

    // Definición NO filtrable — debe existir y ser visible en la ficha,
    // pero jamás debe poder usarse como filtro público (12.5).
    const internalNote = await prisma.categoryAttributeDefinition.create({
      data: {
        categoryId: opticalCategoryId,
        key: `nota_interna_${uniqueTag('k')}`,
        label: 'Nota interna',
        type: 'TEXT',
        filterable: false,
        visibleInDetail: true,
        active: true,
        sortOrder: 1,
      },
    });
    internalNoteDefId = internalNote.id;
    attributeDefinitionIds.push(internalNote.id);
  });

  afterAll(async () => {
    await prisma.productOfferingAttributeValue.deleteMany({ where: { attributeDefinitionId: { in: attributeDefinitionIds } } });
    await prisma.categoryAttributeDefinition.deleteMany({ where: { id: { in: attributeDefinitionIds } } });
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

  async function makeOffering(overrides: { active?: boolean; visible?: boolean; productVisible?: boolean; priceFromClp?: number } = {}) {
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
        visible: overrides.productVisible ?? true,
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
        categoryId: opticalCategoryId,
        title: undefined,
        commercialDescription: undefined,
        priceFromClp: overrides.priceFromClp ?? 19990,
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
    return { offering, product };
  }

  async function setAttributeValue(offeringId: string, attributeDefinitionId: string, valueText: string) {
    await prisma.productOfferingAttributeValue.create({
      data: { offeringId, attributeDefinitionId, valueText },
    });
  }

  it('12.1/12.3 — getCategoryFilterableAttributes expone solo definiciones activas y filtrables de la categoría', async () => {
    const attrs = await getCategoryFilterableAttributes('lentes-opticos');
    const ids = attrs.map((a) => a.id);
    expect(ids).toContain(certificacionDefId);
    expect(ids).not.toContain(internalNoteDefId);
  });

  it('12.2 — un filtro por atributo dinámico reduce el listado a las ofertas con ese valor', async () => {
    const { offering: uv400Offering } = await makeOffering();
    await setAttributeValue(uv400Offering.id, certificacionDefId, 'uv400');
    const { offering: polarizadoOffering } = await makeOffering();
    await setAttributeValue(polarizadoOffering.id, certificacionDefId, 'polarizado');
    const { offering: noAttrOffering } = await makeOffering();

    const attrs = await getCategoryFilterableAttributes('lentes-opticos');
    const dynamicFilters = parseDynamicFilters(attrs, { [`attr_${attrs.find((a) => a.id === certificacionDefId)!.key}`]: 'uv400' });

    const catalog = await getCatalogForCategory('lentes-opticos', { availableOnly: false }, dynamicFilters);
    const resultIds = catalog!.offerings.map((o) => o.id);
    expect(resultIds).toContain(uv400Offering.id);
    expect(resultIds).not.toContain(polarizadoOffering.id);
    expect(resultIds).not.toContain(noAttrOffering.id);
  });

  it('12.6 — un query param desconocido nunca llega a construir la consulta (se descarta, no rompe la página)', async () => {
    const attrs = await getCategoryFilterableAttributes('lentes-opticos');
    const dynamicFilters = parseDynamicFilters(attrs, { attr_no_existe: 'x', attr_certificacion_pero_mal_escrito: 'uv400' });
    expect(dynamicFilters).toEqual([]);
    // La página igual renderiza (no lanza) con el filtro vacío.
    await expect(getCatalogForCategory('lentes-opticos', { availableOnly: false }, dynamicFilters)).resolves.not.toBeNull();
  });

  it('12.6 — un atributo marcado filterable: false nunca puede usarse como filtro público, aunque el query param calce su key', async () => {
    const internalNote = await prisma.categoryAttributeDefinition.findUniqueOrThrow({ where: { id: internalNoteDefId } });
    const attrs = await getCategoryFilterableAttributes('lentes-opticos');
    // La definición no filtrable nunca aparece en la allowlist devuelta:
    expect(attrs.some((a) => a.id === internalNote.id)).toBe(false);
    // Y por lo tanto un query param con su key jamás se resuelve a un filtro real:
    const dynamicFilters = parseDynamicFilters(attrs, { [`attr_${internalNote.key}`]: 'cualquier-valor' });
    expect(dynamicFilters).toEqual([]);
  });

  it('12.6 — filtros comunes y dinámicos combinados aplican AND correctamente', async () => {
    const { offering: matching, product } = await makeOffering({ priceFromClp: 19990 });
    await setAttributeValue(matching.id, certificacionDefId, 'uv400');
    const { offering: wrongPrice } = await makeOffering({ priceFromClp: 99990 });
    await setAttributeValue(wrongPrice.id, certificacionDefId, 'uv400');

    const attrs = await getCategoryFilterableAttributes('lentes-opticos');
    const realKey = attrs.find((a) => a.id === certificacionDefId)!.key;
    const dynamicFilters = parseDynamicFilters(attrs, { [`attr_${realKey}`]: 'uv400' });

    // Ambas ofertas calzan el filtro dinámico (uv400) — solo el precio ('low') distingue.
    const catalog = await getCatalogForCategory('lentes-opticos', { availableOnly: false, price: 'low' }, dynamicFilters);
    const resultIds = catalog!.offerings.map((o) => o.id);
    expect(resultIds).toContain(matching.id);
    expect(resultIds).not.toContain(wrongPrice.id);
    expect(product.priceFromClp).toBe(29990); // Product.priceFromClp (seed value) nunca es la fuente de precio V2
  });

  it('un valor malformado (SELECT fuera de la allowlist de options) se descarta sin romper la página', async () => {
    const attrs = await getCategoryFilterableAttributes('lentes-opticos');
    const realKey = attrs.find((a) => a.id === certificacionDefId)!.key;
    const dynamicFilters = parseDynamicFilters(attrs, { [`attr_${realKey}`]: 'valor-inventado-que-no-existe' });
    expect(dynamicFilters).toEqual([]);
    await expect(getCatalogForCategory('lentes-opticos', { availableOnly: false }, dynamicFilters)).resolves.not.toBeNull();
  });

  it('una oferta inactiva u oculta con el atributo correcto nunca aparece en el filtro dinámico', async () => {
    const { offering: inactive } = await makeOffering({ active: false });
    await setAttributeValue(inactive.id, certificacionDefId, 'uv400');
    const { offering: invisible } = await makeOffering({ visible: false });
    await setAttributeValue(invisible.id, certificacionDefId, 'uv400');

    const attrs = await getCategoryFilterableAttributes('lentes-opticos');
    const realKey = attrs.find((a) => a.id === certificacionDefId)!.key;
    const dynamicFilters = parseDynamicFilters(attrs, { [`attr_${realKey}`]: 'uv400' });

    const catalog = await getCatalogForCategory('lentes-opticos', { availableOnly: false }, dynamicFilters);
    const resultIds = catalog!.offerings.map((o) => o.id);
    expect(resultIds).not.toContain(inactive.id);
    expect(resultIds).not.toContain(invisible.id);
  });
});
