// Covers Fase 9 integration points 7-11: múltiples fotografías, orden y
// portada, reemplazo y eliminación de imágenes, objeto creado/eliminado en
// MinIO real, bucket privado sin acceso anónimo. Real MinIO via the S3
// client, no mocks.
import { afterAll, describe, expect, it } from 'vitest';
import { AdminRole, Gender, ProductMaterial, ProductShape } from '@prisma/client';
import { createProduct } from '@/modules/catalog/admin-service';
import {
  deleteProductImage,
  replaceProductImage,
  reorderProductImages,
  setCoverImage,
  uploadProductImage,
} from '@/modules/catalog/admin-service';
import { buildAttachmentStorageKey, uploadPrivateObject, deletePrivateObject } from '@/modules/storage/private-service';
import { createTestAdmin, deleteTestAdmins, env, objectExistsInBucket, prisma, tinyPngBuffer, uniqueTag } from './helpers';

describe('modules/catalog/admin-service — product gallery + MinIO (integration)', () => {
  const adminIds: string[] = [];
  const brandIds: string[] = [];
  const productIds: string[] = [];

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.brand.deleteMany({ where: { id: { in: brandIds } } });
    await deleteTestAdmins(adminIds);
  });

  async function makeFixture() {
    const { user, session } = await createTestAdmin(AdminRole.ADMIN);
    adminIds.push(user.id);

    const brandTag = uniqueTag('brand');
    const brand = await prisma.brand.create({ data: { name: brandTag, slug: brandTag, active: true } });
    brandIds.push(brand.id);

    const tag = uniqueTag('prod');
    const product = await createProduct(
      {
        name: `Modelo ${tag}`,
        code: tag,
        brandId: brand.id,
        priceFromClp: 35990,
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
      session
    );
    productIds.push(product.id);
    const withColors = await prisma.product.findUniqueOrThrow({ where: { id: product.id }, include: { colors: true } });
    return { session, product, colorId: withColors.colors[0].id };
  }

  it('uploads multiple photos, keeps explicit order, and designates a cover', async () => {
    const { session, product, colorId } = await makeFixture();
    const buffer = await tinyPngBuffer();

    const first = await uploadProductImage(product.id, colorId, { buffer, contentType: 'image/png', size: buffer.length }, session);
    const second = await uploadProductImage(product.id, colorId, { buffer, contentType: 'image/png', size: buffer.length }, session);
    const third = await uploadProductImage(product.id, colorId, { buffer, contentType: 'image/png', size: buffer.length }, session);

    expect(first.isCover).toBe(true); // first upload is auto-cover
    expect(second.isCover).toBe(false);

    expect(await objectExistsInBucket(env.OBJECT_STORAGE_BUCKET, first.storageKey)).toBe(true);

    // Reverse the order explicitly.
    await reorderProductImages(product.id, [third.id, second.id, first.id], session);
    const reordered = await prisma.productImage.findMany({ where: { productId: product.id }, orderBy: { sortOrder: 'asc' } });
    expect(reordered.map((i) => i.id)).toEqual([third.id, second.id, first.id]);

    // Designate a new cover — exactly one photo can be the cover at a time.
    await setCoverImage(second.id, session);
    const covers = await prisma.productImage.findMany({ where: { productId: product.id, isCover: true } });
    expect(covers).toHaveLength(1);
    expect(covers[0].id).toBe(second.id);
  });

  it('replaces a photo (old object removed from MinIO) and deletes a photo (object removed, cover reassigned)', async () => {
    const { session, product, colorId } = await makeFixture();
    const buffer = await tinyPngBuffer();

    const original = await uploadProductImage(product.id, colorId, { buffer, contentType: 'image/png', size: buffer.length }, session);
    const originalKey = original.storageKey;
    expect(await objectExistsInBucket(env.OBJECT_STORAGE_BUCKET, originalKey)).toBe(true);

    const replaced = await replaceProductImage(original.id, { buffer, contentType: 'image/png', size: buffer.length }, session);
    expect(replaced.storageKey).not.toBe(originalKey);
    expect(await objectExistsInBucket(env.OBJECT_STORAGE_BUCKET, replaced.storageKey)).toBe(true);
    expect(await objectExistsInBucket(env.OBJECT_STORAGE_BUCKET, originalKey)).toBe(false);

    // A second photo becomes the new cover once the first (cover) photo is deleted.
    const second = await uploadProductImage(product.id, colorId, { buffer, contentType: 'image/png', size: buffer.length }, session);
    await setCoverImage(original.id, session); // re-designate original(now-replaced-key) image row as cover
    const replacedKeyBeforeDelete = replaced.storageKey;

    await deleteProductImage(original.id, session);
    expect(await objectExistsInBucket(env.OBJECT_STORAGE_BUCKET, replacedKeyBeforeDelete)).toBe(false);

    const remaining = await prisma.productImage.findUnique({ where: { id: second.id } });
    expect(remaining?.isCover).toBe(true); // sole remaining photo inherits cover status
  });

  it('never allows anonymous read access to the private attachments bucket', async () => {
    const key = buildAttachmentStorageKey('pdf');
    await uploadPrivateObject({ key, body: Buffer.from('%PDF-1.4\n%%EOF'), contentType: 'application/pdf' });

    try {
      const anonymousUrl = `${env.OBJECT_STORAGE_ENDPOINT}/${env.PRIVATE_OBJECT_STORAGE_BUCKET}/${key}`;
      const res = await fetch(anonymousUrl);
      expect(res.status).toBe(403);
    } finally {
      await deletePrivateObject(key);
    }
  });
});
