// Cubre el cierre operativo de la Fase 12 (redesign-extensible-catalog-v2)
// — la capacidad admin para asignar valores de ProductOfferingAttributeValue
// a una oferta concreta. Real Postgres via Prisma, no mocks; usa
// createAttribute/createOffering/updateOfferingAttributeValues reales (no
// SQL directo) para demostrar el flujo, igual que product-offerings.test.ts.
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { AdminRole, CategoryAttributeType, Gender, ProductMaterial, ProductShape } from '@prisma/client';
import { createProduct } from '@/modules/catalog/admin-service';
import { createOffering } from '@/modules/catalog/offering-service';
import { createAttribute } from '@/modules/catalog/category-attribute-service';
import { getOfferingAttributeContext, updateOfferingAttributeValues } from '@/modules/catalog/offering-attribute-service';
import { ValidationError } from '@/lib/errors';
import { seedCategories } from '../prisma/seed';
import { createTestAdmin, deleteTestAdmins, prisma, uniqueTag } from './helpers';

describe('modules/catalog/offering-attribute-service (integration)', () => {
  const adminIds: string[] = [];
  const brandIds: string[] = [];
  const productIds: string[] = [];
  const offeringIds: string[] = [];
  const attributeIds: string[] = [];

  beforeAll(async () => {
    await seedCategories();
  });

  afterAll(async () => {
    await prisma.categoryAttributeDefinition.deleteMany({ where: { id: { in: attributeIds } } });
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

  async function categoryIdBySlug(slug: string) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug } });
    return category.id;
  }

  async function makeProduct(actor: Awaited<ReturnType<typeof makeActor>>) {
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

  async function makeOffering(actor: Awaited<ReturnType<typeof makeActor>>, categoryId: string) {
    const product = await makeProduct(actor);
    const offering = await createOffering(
      {
        productId: product.id,
        categoryId,
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
    return offering;
  }

  async function makeAttribute(
    actor: Awaited<ReturnType<typeof makeActor>>,
    categoryId: string,
    overrides: Partial<{
      type: CategoryAttributeType;
      options: string[];
      filterable: boolean;
      active: boolean;
    }> = {}
  ) {
    const tag = uniqueTag('attr');
    const attribute = await createAttribute(
      {
        categoryId,
        key: tag,
        label: `Atributo ${tag}`,
        type: overrides.type ?? CategoryAttributeType.SELECT,
        required: false,
        filterable: overrides.filterable ?? true,
        visibleInCard: false,
        visibleInDetail: true,
        sortOrder: 0,
        options: overrides.options ?? ['A', 'B'],
        active: overrides.active ?? true,
      },
      actor
    );
    attributeIds.push(attribute.id);
    return attribute;
  }

  it('persists a SELECT value via the real admin service and reads it back', async () => {
    const actor = await makeActor();
    const opticalId = await categoryIdBySlug('lentes-opticos');
    const offering = await makeOffering(actor, opticalId);
    const attribute = await makeAttribute(actor, opticalId, { options: ['Acetato', 'Metal'] });

    await updateOfferingAttributeValues(
      { offeringId: offering.id, values: [{ attributeDefinitionId: attribute.id, textValue: 'Acetato', multiValues: null, numberValue: null, booleanValue: null }] },
      actor
    );

    const context = await getOfferingAttributeContext(offering.id);
    const value = context.values.find((v) => v.attributeDefinitionId === attribute.id);
    expect(value?.textValue).toBe('Acetato');
  });

  it('updating an existing value overwrites it (upsert), never duplicates rows', async () => {
    const actor = await makeActor();
    const opticalId = await categoryIdBySlug('lentes-opticos');
    const offering = await makeOffering(actor, opticalId);
    const attribute = await makeAttribute(actor, opticalId, { options: ['Acetato', 'Metal'] });

    await updateOfferingAttributeValues(
      { offeringId: offering.id, values: [{ attributeDefinitionId: attribute.id, textValue: 'Acetato', multiValues: null, numberValue: null, booleanValue: null }] },
      actor
    );
    await updateOfferingAttributeValues(
      { offeringId: offering.id, values: [{ attributeDefinitionId: attribute.id, textValue: 'Metal', multiValues: null, numberValue: null, booleanValue: null }] },
      actor
    );

    const rows = await prisma.productOfferingAttributeValue.findMany({
      where: { offeringId: offering.id, attributeDefinitionId: attribute.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].valueText).toBe('Metal');
  });

  it('explicitly removing a value deletes the row, not just blanks it', async () => {
    const actor = await makeActor();
    const opticalId = await categoryIdBySlug('lentes-opticos');
    const offering = await makeOffering(actor, opticalId);
    const attribute = await makeAttribute(actor, opticalId, { options: ['Acetato', 'Metal'] });

    await updateOfferingAttributeValues(
      { offeringId: offering.id, values: [{ attributeDefinitionId: attribute.id, textValue: 'Acetato', multiValues: null, numberValue: null, booleanValue: null }] },
      actor
    );
    await updateOfferingAttributeValues(
      { offeringId: offering.id, values: [{ attributeDefinitionId: attribute.id, textValue: null, multiValues: null, numberValue: null, booleanValue: null }] },
      actor
    );

    const rows = await prisma.productOfferingAttributeValue.findMany({
      where: { offeringId: offering.id, attributeDefinitionId: attribute.id },
    });
    expect(rows).toHaveLength(0);
  });

  it('an invalid value in the same submit rolls back the entire transaction (no partial writes)', async () => {
    const actor = await makeActor();
    const opticalId = await categoryIdBySlug('lentes-opticos');
    const offering = await makeOffering(actor, opticalId);
    const validAttr = await makeAttribute(actor, opticalId, { options: ['Acetato', 'Metal'] });
    const invalidAttr = await makeAttribute(actor, opticalId, { options: ['X', 'Y'] });

    await expect(
      updateOfferingAttributeValues(
        {
          offeringId: offering.id,
          values: [
            { attributeDefinitionId: validAttr.id, textValue: 'Acetato', multiValues: null, numberValue: null, booleanValue: null },
            { attributeDefinitionId: invalidAttr.id, textValue: 'no-existe', multiValues: null, numberValue: null, booleanValue: null },
          ],
        },
        actor
      )
    ).rejects.toThrow(ValidationError);

    const rows = await prisma.productOfferingAttributeValue.findMany({ where: { offeringId: offering.id } });
    expect(rows).toHaveLength(0); // ninguno de los dos se persistió
  });

  it('values are isolated between two offerings of the same product/category', async () => {
    const actor = await makeActor();
    const opticalId = await categoryIdBySlug('lentes-opticos');
    const offeringA = await makeOffering(actor, opticalId);
    const offeringB = await makeOffering(actor, opticalId);
    const attribute = await makeAttribute(actor, opticalId, { options: ['Acetato', 'Metal'] });

    await updateOfferingAttributeValues(
      { offeringId: offeringA.id, values: [{ attributeDefinitionId: attribute.id, textValue: 'Acetato', multiValues: null, numberValue: null, booleanValue: null }] },
      actor
    );

    const contextB = await getOfferingAttributeContext(offeringB.id);
    expect(contextB.values.find((v) => v.attributeDefinitionId === attribute.id)?.textValue).toBeNull();
  });

  it('rejects an attributeDefinitionId that belongs to a different category', async () => {
    const actor = await makeActor();
    const opticalId = await categoryIdBySlug('lentes-opticos');
    const sunId = await categoryIdBySlug('lentes-de-sol');
    const offering = await makeOffering(actor, opticalId);
    const sunAttribute = await makeAttribute(actor, sunId, { options: ['Espejado', 'Polarizado'] });

    await expect(
      updateOfferingAttributeValues(
        { offeringId: offering.id, values: [{ attributeDefinitionId: sunAttribute.id, textValue: 'Espejado', multiValues: null, numberValue: null, booleanValue: null }] },
        actor
      )
    ).rejects.toThrow(ValidationError);

    const rows = await prisma.productOfferingAttributeValue.findMany({ where: { offeringId: offering.id } });
    expect(rows).toHaveLength(0);
  });

  it('deleting a CategoryAttributeDefinition cascades to remove its ProductOfferingAttributeValue rows', async () => {
    const actor = await makeActor();
    const opticalId = await categoryIdBySlug('lentes-opticos');
    const offering = await makeOffering(actor, opticalId);
    const attribute = await makeAttribute(actor, opticalId, { options: ['Acetato', 'Metal'] });

    await updateOfferingAttributeValues(
      { offeringId: offering.id, values: [{ attributeDefinitionId: attribute.id, textValue: 'Acetato', multiValues: null, numberValue: null, booleanValue: null }] },
      actor
    );

    await prisma.categoryAttributeDefinition.delete({ where: { id: attribute.id } });
    attributeIds.splice(attributeIds.indexOf(attribute.id), 1);

    const rows = await prisma.productOfferingAttributeValue.findMany({ where: { attributeDefinitionId: attribute.id } });
    expect(rows).toHaveLength(0);
  });

  it('MULTI_SELECT filter matches an offering by one of several selected values (JSON-array storage bug fix)', async () => {
    const actor = await makeActor();
    const opticalId = await categoryIdBySlug('lentes-opticos');
    const matchingOffering = await makeOffering(actor, opticalId);
    const otherOffering = await makeOffering(actor, opticalId);
    const attribute = await makeAttribute(actor, opticalId, {
      type: CategoryAttributeType.MULTI_SELECT,
      options: ['Antirreflejo', 'Fotocromático', 'Azul'],
    });

    await updateOfferingAttributeValues(
      {
        offeringId: matchingOffering.id,
        values: [{ attributeDefinitionId: attribute.id, textValue: null, multiValues: ['Antirreflejo', 'Azul'], numberValue: null, booleanValue: null }],
      },
      actor
    );
    await updateOfferingAttributeValues(
      {
        offeringId: otherOffering.id,
        values: [{ attributeDefinitionId: attribute.id, textValue: null, multiValues: ['Fotocromático'], numberValue: null, booleanValue: null }],
      },
      actor
    );

    // Confirma la forma de almacenamiento real: un único array JSON en
    // valueText, nunca una fila por valor (ver comentario del schema Prisma).
    const stored = await prisma.productOfferingAttributeValue.findFirstOrThrow({
      where: { offeringId: matchingOffering.id, attributeDefinitionId: attribute.id },
    });
    expect(stored.valueText).toBe(JSON.stringify(['Antirreflejo', 'Azul']));

    const { getCatalogForCategory } = await import('@/modules/catalog/service');
    const { parseDynamicFilters, selectFilterableAttributes } = await import('@/modules/catalog/dynamic-filters');

    const definitions = await prisma.categoryAttributeDefinition.findMany({ where: { categoryId: opticalId } });
    const filterable = selectFilterableAttributes(definitions);
    // Filtra por "Azul" — presente en matchingOffering (junto a Antirreflejo)
    // y ausente en otherOffering (solo tiene Fotocromático). Antes del fix,
    // { valueText: { in: ['Azul'] } } nunca calzaba contra el array JSON
    // serializado, así que este filtro no devolvía ninguna oferta.
    const dynamicFilters = parseDynamicFilters(filterable, { [`attr_${attribute.key}`]: 'Azul' });

    const result = await getCatalogForCategory('lentes-opticos', { availableOnly: false }, dynamicFilters);
    const ids = result!.offerings.map((o) => o.id);
    expect(ids).toContain(matchingOffering.id);
    expect(ids).not.toContain(otherOffering.id);
  });

  it('end-to-end: a value assigned via the real admin service surfaces as a working public catalog filter', async () => {
    const actor = await makeActor();
    const opticalId = await categoryIdBySlug('lentes-opticos');
    const matchingOffering = await makeOffering(actor, opticalId);
    const otherOffering = await makeOffering(actor, opticalId);
    const attribute = await makeAttribute(actor, opticalId, { options: ['Acetato', 'Metal'] });

    await updateOfferingAttributeValues(
      { offeringId: matchingOffering.id, values: [{ attributeDefinitionId: attribute.id, textValue: 'Acetato', multiValues: null, numberValue: null, booleanValue: null }] },
      actor
    );
    // otherOffering se deja explícitamente sin valor — nunca debe calzar con el filtro.

    const { getCatalogForCategory } = await import('@/modules/catalog/service');
    const { parseDynamicFilters, selectFilterableAttributes } = await import('@/modules/catalog/dynamic-filters');

    const definitions = await prisma.categoryAttributeDefinition.findMany({ where: { categoryId: opticalId } });
    const filterable = selectFilterableAttributes(definitions);
    const dynamicFilters = parseDynamicFilters(filterable, { [`attr_${attribute.key}`]: 'Acetato' });

    const result = await getCatalogForCategory('lentes-opticos', { availableOnly: false }, dynamicFilters);
    const ids = result!.offerings.map((o) => o.id);
    expect(ids).toContain(matchingOffering.id);
    expect(ids).not.toContain(otherOffering.id);
  });
});
