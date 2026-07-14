// Covers Fase 9 integration points 1-6: CRUD de producto, publicar/
// despublicar, marca, colores, agregar/quitar color, bloqueo de
// eliminación de color con imágenes. Real Postgres via Prisma, no mocks.
import { afterAll, describe, expect, it } from 'vitest';
import { AdminRole, Gender, ProductMaterial, ProductShape } from '@prisma/client';
import {
  addProductColor,
  createProduct,
  deleteProduct,
  removeProductColor,
  updateProduct,
} from '@/modules/catalog/admin-service';
import { createTestAdmin, deleteTestAdmins, prisma, uniqueTag } from './helpers';

describe('modules/catalog/admin-service — product CRUD (integration)', () => {
  const adminIds: string[] = [];
  const brandIds: string[] = [];
  const productIds: string[] = [];

  afterAll(async () => {
    // Reverse dependency order: products first (colors/images cascade with
    // the product), then the brand, then the test admin.
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.brand.deleteMany({ where: { id: { in: brandIds } } });
    await deleteTestAdmins(adminIds);
  });

  async function makeBrand() {
    const tag = uniqueTag('brand');
    const brand = await prisma.brand.create({
      data: { name: tag, slug: tag, active: true },
    });
    brandIds.push(brand.id);
    return brand;
  }

  async function makeActor() {
    const { user, session } = await createTestAdmin(AdminRole.ADMIN);
    adminIds.push(user.id);
    return session;
  }

  it('creates a product, reads it back, updates a field, and deletes it (full CRUD)', async () => {
    const actor = await makeActor();
    const brand = await makeBrand();
    const tag = uniqueTag('prod');

    const created = await createProduct(
      {
        name: `Modelo ${tag}`,
        code: tag,
        brandId: brand.id,
        priceFromClp: 39990,
        sizes: undefined,
        gender: Gender.UNISEX,
        shape: ProductShape.REDONDO,
        material: ProductMaterial.ACETATO,
        available: true,
        visible: true,
        badge: undefined,
        description: 'Producto de prueba de integración.',
        colors: [{ name: 'Negro', hex: '#000000' }],
      },
      actor
    );
    productIds.push(created.id);

    expect(created.code).toBe(tag);
    expect(created.brandId).toBe(brand.id);

    const fetched = await prisma.product.findUniqueOrThrow({ where: { id: created.id }, include: { colors: true } });
    expect(fetched.name).toBe(`Modelo ${tag}`);
    expect(fetched.colors).toHaveLength(1);

    const updated = await updateProduct(
      created.id,
      {
        name: `Modelo ${tag} editado`,
        code: tag,
        brandId: brand.id,
        priceFromClp: 44990,
        sizes: undefined,
        gender: Gender.UNISEX,
        shape: ProductShape.REDONDO,
        material: ProductMaterial.ACETATO,
        available: true,
        visible: true,
        badge: undefined,
        description: 'Producto de prueba de integración (editado).',
        colors: [],
      },
      actor
    );
    expect(updated.name).toBe(`Modelo ${tag} editado`);
    expect(updated.priceFromClp).toBe(44990);

    await deleteProduct(created.id, actor);
    productIds.splice(productIds.indexOf(created.id), 1);

    const afterDelete = await prisma.product.findUnique({ where: { id: created.id } });
    expect(afterDelete).toBeNull();

    const auditActions = await prisma.auditLogEntry.findMany({
      where: { targetId: created.id, targetType: 'Product' },
      select: { action: true },
    });
    expect(auditActions.map((a) => a.action)).toEqual(
      expect.arrayContaining(['product.created', 'product.updated', 'product.deleted'])
    );
  });

  it('toggles visible (publish/unpublish) independently of available (stock)', async () => {
    const actor = await makeActor();
    const brand = await makeBrand();
    const tag = uniqueTag('prod');

    const created = await createProduct(
      {
        name: `Modelo ${tag}`,
        code: tag,
        brandId: brand.id,
        priceFromClp: 19990,
        sizes: undefined,
        gender: Gender.MUJER,
        shape: ProductShape.CAT_EYE,
        material: ProductMaterial.METAL,
        available: false,
        visible: true,
        badge: undefined,
        description: undefined,
        colors: [],
      },
      actor
    );
    productIds.push(created.id);
    expect(created.visible).toBe(true);
    expect(created.available).toBe(false);

    const unpublished = await updateProduct(
      created.id,
      {
        name: created.name,
        code: created.code,
        brandId: brand.id,
        priceFromClp: created.priceFromClp,
        sizes: undefined,
        gender: Gender.MUJER,
        shape: ProductShape.CAT_EYE,
        material: ProductMaterial.METAL,
        available: false,
        visible: false,
        badge: undefined,
        description: undefined,
        colors: [],
      },
      actor
    );
    expect(unpublished.visible).toBe(false);
    expect(unpublished.available).toBe(false);
  });

  it('adds and removes a color independently of the whole-form save', async () => {
    const actor = await makeActor();
    const brand = await makeBrand();
    const tag = uniqueTag('prod');

    const created = await createProduct(
      {
        name: `Modelo ${tag}`,
        code: tag,
        brandId: brand.id,
        priceFromClp: 29990,
        sizes: undefined,
        gender: Gender.HOMBRE,
        shape: ProductShape.AVIADOR,
        material: ProductMaterial.MIXTO,
        available: true,
        visible: true,
        badge: undefined,
        description: undefined,
        colors: [],
      },
      actor
    );
    productIds.push(created.id);

    const color = await addProductColor(created.id, { name: 'Azul', hex: '#0000ff' }, actor);
    const withColor = await prisma.product.findUniqueOrThrow({ where: { id: created.id }, include: { colors: true } });
    expect(withColor.colors.map((c) => c.id)).toContain(color.id);

    const removed = await removeProductColor(created.id, color.id, actor);
    expect(removed).toEqual({ status: 'removed' });
    const afterRemoval = await prisma.productColor.findUnique({ where: { id: color.id } });
    expect(afterRemoval).toBeNull();
  });

  it('blocks removing a color that still has photos, with an explicit message (never silent)', async () => {
    const actor = await makeActor();
    const brand = await makeBrand();
    const tag = uniqueTag('prod');

    const created = await createProduct(
      {
        name: `Modelo ${tag}`,
        code: tag,
        brandId: brand.id,
        priceFromClp: 25990,
        sizes: undefined,
        gender: Gender.INFANTIL,
        shape: ProductShape.CUADRADO,
        material: ProductMaterial.ACETATO,
        available: true,
        visible: true,
        badge: undefined,
        description: undefined,
        colors: [],
      },
      actor
    );
    productIds.push(created.id);

    const color = await addProductColor(created.id, { name: 'Rojo', hex: '#ff0000' }, actor);
    // A photo row is enough to exercise the block — the storage upload
    // path itself is covered end-to-end in product-gallery-storage.test.ts.
    await prisma.productImage.create({
      data: {
        productId: created.id,
        productColorId: color.id,
        storageKey: `products/${created.id}/photo-${uniqueTag()}.png`,
        url: 'http://localhost:9000/pepivision360-products/placeholder.png',
        sortOrder: 0,
        isCover: true,
      },
    });

    const result = await removeProductColor(created.id, color.id, actor);
    expect(result.status).toBe('blocked');
    if (result.status === 'blocked') {
      expect(result.photoCount).toBe(1);
    }

    const stillExists = await prisma.productColor.findUnique({ where: { id: color.id } });
    expect(stillExists).not.toBeNull();
  });

  it('rejects an inactive or nonexistent brand (server-side, never trusting client-sent text)', async () => {
    const actor = await makeActor();
    const brand = await makeBrand();
    await prisma.brand.update({ where: { id: brand.id }, data: { active: false } });
    const tag = uniqueTag('prod');

    await expect(
      createProduct(
        {
          name: `Modelo ${tag}`,
          code: tag,
          brandId: brand.id,
          priceFromClp: 10000,
          sizes: undefined,
          gender: Gender.UNISEX,
          shape: ProductShape.REDONDO,
          material: ProductMaterial.ACETATO,
          available: true,
          visible: true,
          badge: undefined,
          description: undefined,
          colors: [],
        },
        actor
      )
    ).rejects.toThrow();
  });
});
